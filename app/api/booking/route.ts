import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { buildAvailableSlots, type OpeningHour, type SalonClosure, type TimeInterval } from "@/lib/salon-availability";
import { consumeRateLimit, isSameOriginRequest, rateLimitKey } from "@/lib/booking-security";
import { sendBookingConfirmationEmail } from "@/lib/booking-confirmation-email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { customerEmailAllowed, customerPortalMode, getCustomerAccount, CustomerAccountError } from "@/lib/customer-account";

const TIME_ZONE = "Europe/Rome";
const BOOKING_DAYS_AHEAD = 28;
const MINIMUM_NOTICE_MINUTES = 30;
const MAX_BODY_BYTES = 8_192;

type BookingInput = {
	serviceId: string;
	employeeId: string;
	date: string;
	time: string;
	name: string;
	phone: string;
	email: string;
};

function client() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Configurazione di prenotazione mancante.");
	return createClient(url, key, { auth: { persistSession: false } });
}

function jsonError(message: string, status: number, headers?: HeadersInit) {
	return NextResponse.json({ error: message }, { status, headers });
}

type AppointmentSummary = {
	final_price: number | string | null;
	final_duration_minutes: number | null;
	start_time: string;
	end_time: string;
};

function bookingSuccess(requestId: string, appointment: AppointmentSummary, status = 200) {
	return NextResponse.json({
		ok: true,
		requestId,
		price: appointment.final_price,
		durationMinutes: appointment.final_duration_minutes,
		startTime: appointment.start_time,
		endTime: appointment.end_time,
	}, { status });
}

function bookingDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_DATE");
	const date = Temporal.PlainDate.from(value);
	if (date.toString() !== value) throw new Error("INVALID_DATE");
	return date;
}

function isDateInsideBookingWindow(value: string) {
	try {
		const date = bookingDate(value);
		const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate();
		const days = today.until(date).days;
		return days >= 0 && days < BOOKING_DAYS_AHEAD;
	} catch {
		return false;
	}
}

function isStartFarEnoughInFuture(date: string, time: string) {
	try {
		const start = Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(TIME_ZONE);
		const minimum = Temporal.Now.zonedDateTimeISO(TIME_ZONE).add({ minutes: MINIMUM_NOTICE_MINUTES });
		return Temporal.ZonedDateTime.compare(start, minimum) >= 0;
	} catch {
		return false;
	}
}

function cleanText(value: unknown, maxLength: number) {
	if (typeof value !== "string") return null;
	const cleaned = value.trim();
	if (!cleaned || cleaned.length > maxLength || /[\u0000-\u001f\u007f]/.test(cleaned)) return null;
	return cleaned;
}

function parseBookingInput(value: unknown): BookingInput | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const body = value as Record<string, unknown>;
	const serviceId = cleanText(body.serviceId, 100);
	const employeeId = cleanText(body.employeeId, 100);
	const name = cleanText(body.name, 100);
	const phone = typeof body.phone === "string" ? body.phone.trim() : "";
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const date = typeof body.date === "string" ? body.date : "";
	const time = typeof body.time === "string" ? body.time : "";

	if (!serviceId || !employeeId || !name || name.length < 2) return null;
	if (!/^\d{2}:\d{2}$/.test(time) || !isDateInsideBookingWindow(date)) return null;
	if (phone && (phone.length < 6 || phone.length > 30 || !/^[+\d][\d\s()./-]*$/.test(phone))) return null;
	if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
	if (!phone && !email) return null;

	return { serviceId, employeeId, date, time, name, phone, email };
}

async function readJsonBody(request: NextRequest) {
	if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
		throw new Error("UNSUPPORTED_MEDIA_TYPE");
	}
	const declaredLength = Number(request.headers.get("content-length") ?? 0);
	if (declaredLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
	const raw = await request.text();
	if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
	return JSON.parse(raw) as unknown;
}

async function salonRules(supabase: ReturnType<typeof client>) {
	const { data: salon, error } = await supabase.from("salon").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
	if (error) throw error;
	if (!salon) return { openingHours: [] as OpeningHour[], closures: [] as SalonClosure[] };
	const [hours, closures] = await Promise.all([
		supabase.from("salon_opening_hours").select("day_of_week, is_open, open_time, break_start, break_end, close_time").eq("salon_id", salon.id),
		supabase.from("salon_closures").select("start_date, end_date, all_day, start_time, end_time").eq("salon_id", salon.id),
	]);
	if (hours.error) throw hours.error;
	if (closures.error) throw closures.error;
	return { openingHours: (hours.data ?? []) as OpeningHour[], closures: (closures.data ?? []) as SalonClosure[] };
}

function localInterval(row: { start_time: string; end_time: string }): TimeInterval {
	const start = Temporal.Instant.from(row.start_time).toZonedDateTimeISO(TIME_ZONE);
	const end = Temporal.Instant.from(row.end_time).toZonedDateTimeISO(TIME_ZONE);
	return { start: start.toPlainTime().toString({ smallestUnit: "minute" }), end: end.toPlainTime().toString({ smallestUnit: "minute" }) };
}

async function availableSlots(supabase: ReturnType<typeof client>, employeeId: string, serviceId: string, date: string) {
	if (!isDateInsideBookingWindow(date)) throw new Error("INVALID_DATE");
	const day = bookingDate(date);
	const dayStart = day.toZonedDateTime(TIME_ZONE).toInstant();
	const dayEnd = day.add({ days: 1 }).toZonedDateTime(TIME_ZONE).toInstant();
	const [{ data: service, error: serviceError }, { data: employee, error: employeeError }, { data: appointments, error: appointmentsError }, rules] = await Promise.all([
		supabase.from("services").select("id, duration").eq("id", serviceId).eq("is_active", true).maybeSingle(),
		supabase.from("employees").select("id").eq("id", employeeId).eq("is_active", true).maybeSingle(),
		supabase.from("appointments").select("start_time, end_time").eq("employee_id", employeeId).eq("status", "scheduled").lt("start_time", dayEnd.toString()).gt("end_time", dayStart.toString()),
		salonRules(supabase),
	]);
	if (serviceError) throw serviceError;
	if (employeeError) throw employeeError;
	if (appointmentsError) throw appointmentsError;
	if (!service) throw new Error("SERVICE_UNAVAILABLE");
	if (!employee) throw new Error("EMPLOYEE_UNAVAILABLE");
	const duration = Number(service.duration);
	if (!Number.isSafeInteger(duration) || duration <= 0 || duration > 12 * 60) throw new Error("SERVICE_UNAVAILABLE");
	const busyIntervals = (appointments ?? []).map(localInterval);
	const allSlots = buildAvailableSlots({ date, durationMinutes: duration, ...rules });
	const available = buildAvailableSlots({ date, durationMinutes: duration, busyIntervals, ...rules })
		.filter((time) => isStartFarEnoughInFuture(date, time));
	return { availableSlots: available, slots: allSlots.map((time) => ({ time, disabled: !available.includes(time) })) };
}

async function enforceRateLimit(request: NextRequest, supabase: ReturnType<typeof client>, scope: string, limit: number, windowSeconds: number) {
	return consumeRateLimit(supabase, rateLimitKey(request, scope), limit, windowSeconds);
}

export async function GET(request: NextRequest) {
	try {
		const supabase = client();
		const serviceId = request.nextUrl.searchParams.get("serviceId");
		const employeeId = request.nextUrl.searchParams.get("employeeId");
		const date = request.nextUrl.searchParams.get("date");
		const isSlotRequest = Boolean(serviceId || employeeId || date);
		const rateLimit = await enforceRateLimit(request, supabase, isSlotRequest ? "slots" : "catalog", isSlotRequest ? 60 : 120, 60);
		if (rateLimit === "blocked") return jsonError("Troppe richieste. Riprova tra un minuto.", 429, { "Retry-After": "60" });
		if (rateLimit === "unavailable") return jsonError("Servizio temporaneamente non disponibile.", 503, { "Retry-After": "30" });

		if (isSlotRequest) {
			if (!serviceId || !employeeId || !date) return jsonError("Parametri disponibilità non validi.", 400);
			return NextResponse.json({ slots: (await availableSlots(supabase, employeeId, serviceId, date)).slots });
		}

		const [services, employees, categories, categoryLinks, rules] = await Promise.all([
			supabase.from("services").select("id, name, description, duration, price").eq("is_active", true).order("name"),
			supabase.from("employees").select("id, name").eq("is_active", true).order("name"),
			supabase.from("categories").select("id, name, color").eq("is_active", true).order("name"),
			supabase.from("categories2services").select("service_id, categories_id, categories(name, color, is_active)"),
			salonRules(supabase),
		]);
		if (services.error) throw services.error;
		if (employees.error) throw employees.error;
		if (categories.error) throw categories.error;
		if (categoryLinks.error) throw categoryLinks.error;
		const categoriesByService = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
		const categoryIdsByService = new Map<string, string[]>();
		for (const row of (categoryLinks.data ?? []) as Array<{ service_id: string | number; categories_id: string | number; categories: { name?: string; color?: string | null; is_active?: boolean } | null }>) {
			if (!row.categories?.name || row.categories.is_active === false) continue;
			const id = String(row.service_id);
			categoriesByService.set(id, [...(categoriesByService.get(id) ?? []), { id: String(row.categories_id), name: row.categories.name, color: row.categories.color ?? null }]);
			categoryIdsByService.set(id, [...(categoryIdsByService.get(id) ?? []), String(row.categories_id)]);
		}
		return NextResponse.json({
			services: (services.data ?? []).map((service) => ({ ...service, id: String(service.id), categories: (categoriesByService.get(String(service.id)) ?? []).map((category) => category.name), categoryDetails: categoriesByService.get(String(service.id)) ?? [], categoryIds: categoryIdsByService.get(String(service.id)) ?? [] })),
			employees: (employees.data ?? []).map((employee) => ({ ...employee, id: String(employee.id) })),
			categories: (categories.data ?? []).map((category) => ({ ...category, id: String(category.id) })),
			...rules,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "INVALID_DATE") return jsonError("Data non valida o fuori dall'intervallo prenotabile.", 400);
		console.error("Booking availability error:", error);
		return jsonError("Impossibile caricare la disponibilità.", 500);
	}
}

export async function POST(request: NextRequest) {
	if (!isSameOriginRequest(request)) return jsonError("Origine della richiesta non consentita.", 403);

	try {
		const supabase = client();
		const rateLimit = await enforceRateLimit(request, supabase, "create", 6, 10 * 60);
		if (rateLimit === "blocked") return jsonError("Troppi tentativi di prenotazione. Riprova più tardi.", 429, { "Retry-After": "600" });
		if (rateLimit === "unavailable") return jsonError("Prenotazioni temporaneamente non disponibili.", 503, { "Retry-After": "30" });

		const body = parseBookingInput(await readJsonBody(request));
		if (!body) return jsonError("Dati della prenotazione non validi.", 400);
		let account = null;
		if (customerPortalMode() !== "off") {
			const auth = await createSupabaseServerClient();
			const { data: { user } } = await auth.auth.getUser();
			if (user?.email_confirmed_at && user.email && customerEmailAllowed(user.email)) account = await getCustomerAccount();
		}
		if (!isStartFarEnoughInFuture(body.date, body.time)) return jsonError(`Prenota con almeno ${MINIMUM_NOTICE_MINUTES} minuti di anticipo.`, 400);

		const suppliedRequestId = request.headers.get("idempotency-key");
		const requestId = suppliedRequestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
		const { data: existing, error: existingError } = await supabase.from("appointments").select("final_price, final_duration_minutes, start_time, end_time").eq("booking_request_id", requestId).maybeSingle();
		if (existingError) throw existingError;
		if (existing) return bookingSuccess(requestId, existing);

		const availability = await availableSlots(supabase, body.employeeId, body.serviceId, body.date);
		if (!availability.availableSlots.includes(body.time)) return jsonError("Questo orario non è più disponibile.", 409);
		const [serviceResult, employeeResult] = await Promise.all([
			supabase.from("services").select("name, price, duration").eq("id", body.serviceId).eq("is_active", true).single(),
			supabase.from("employees").select("name").eq("id", body.employeeId).eq("is_active", true).single(),
		]);
		if (serviceResult.error) throw serviceResult.error;
		if (employeeResult.error) throw employeeResult.error;
		const service = serviceResult.data;
		const employee = employeeResult.data;

		let customerId: string | undefined = account?.id;
		if (!customerId && body.email) {
			const { data: matches, error } = await supabase.rpc("find_customer_email_matches", { p_email: body.email });
			if (error) throw error;
			if (matches?.length === 1) customerId = matches[0].id;
		}
		if (!customerId && !body.email) {
			const { data, error } = await supabase.from("customers").select("id").eq("phone", body.phone).eq("is_active", true).limit(1).maybeSingle();
			if (error) throw error;
			customerId = data?.id;
		}
		if (!customerId) {
			const { data, error } = await supabase.from("customers").insert({ name: body.name, phone: body.phone || null, email: body.email || null }).select("id").single();
			if (error) throw error;
			customerId = data.id;
		}

		const start = Temporal.PlainDateTime.from(`${body.date}T${body.time}`).toZonedDateTime(TIME_ZONE);
		const duration = Number(service.duration);
		const end = start.add({ minutes: duration });
		const { data: appointment, error } = await supabase.from("appointments").insert({ customer_id: customerId, employee_id: body.employeeId, service_id: body.serviceId, start_time: start.toInstant().toString(), end_time: end.toInstant().toString(), status: "scheduled", final_price: service.price ?? null, final_duration_minutes: duration, appointment_source: "online", booking_request_id: requestId }).select("final_price, final_duration_minutes, start_time, end_time").single();
		if (error) {
			if (error.code === "23P01") return jsonError("Questo orario è appena stato prenotato. Scegline un altro.", 409);
			if (error.code === "23505") {
				const { data: duplicate } = await supabase.from("appointments").select("final_price, final_duration_minutes, start_time, end_time").eq("booking_request_id", requestId).maybeSingle();
				if (duplicate) return bookingSuccess(requestId, duplicate);
			}
			throw error;
		}
		const emailRecipient = account?.email ?? body.email;
		if (emailRecipient) {
			try {
				await sendBookingConfirmationEmail({
					to: emailRecipient,
					customerName: account?.name ?? body.name,
					serviceName: service.name,
					employeeName: employee.name,
					startTime: appointment.start_time,
					endTime: appointment.end_time,
					durationMinutes: appointment.final_duration_minutes,
					price: appointment.final_price,
				});
			} catch (emailError) {
				console.error("Booking confirmation email error:", { requestId, error: emailError });
			}
		}
		return bookingSuccess(requestId, appointment, 201);
	} catch (error) {
		if (error instanceof CustomerAccountError) return jsonError(error.message, error.status);
		if (error instanceof SyntaxError) return jsonError("JSON non valido.", 400);
		if (error instanceof Error && error.message === "UNSUPPORTED_MEDIA_TYPE") return jsonError("Invia la richiesta come application/json.", 415);
		if (error instanceof Error && error.message === "BODY_TOO_LARGE") return jsonError("Richiesta troppo grande.", 413);
		console.error("Booking save error:", error);
		return jsonError("Impossibile salvare la prenotazione.", 500);
	}
}
