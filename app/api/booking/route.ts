import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { buildAvailableSlots, type OpeningHour, type SalonClosure, type TimeInterval } from "@/lib/salon-availability";

const TIME_ZONE = "Europe/Rome";

function client() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Configurazione di prenotazione mancante.");
	return createClient(url, key, { auth: { persistSession: false } });
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

function localInterval(row: { start_time: string; end_time: string }): { date: string; interval: TimeInterval } {
	const start = Temporal.Instant.from(row.start_time).toZonedDateTimeISO(TIME_ZONE);
	const end = Temporal.Instant.from(row.end_time).toZonedDateTimeISO(TIME_ZONE);
	return { date: start.toPlainDate().toString(), interval: { start: start.toPlainTime().toString({ smallestUnit: "minute" }), end: end.toPlainTime().toString({ smallestUnit: "minute" }) } };
}

async function availableSlots(supabase: ReturnType<typeof client>, employeeId: string, serviceId: string, date: string) {
	const [{ data: service, error: serviceError }, { data: employee, error: employeeError }, { data: appointments, error: appointmentsError }, rules] = await Promise.all([
		supabase.from("services").select("id, duration").eq("id", serviceId).eq("is_active", true).maybeSingle(),
		supabase.from("employees").select("id").eq("id", employeeId).eq("is_active", true).maybeSingle(),
		supabase.from("appointments").select("start_time, end_time").eq("employee_id", employeeId).eq("status", "scheduled"),
		salonRules(supabase),
	]);
	if (serviceError) throw serviceError;
	if (employeeError) throw employeeError;
	if (appointmentsError) throw appointmentsError;
	if (!service) throw new Error("Servizio non disponibile.");
	if (!employee) throw new Error("Operatore non disponibile.");
	const busyIntervals = (appointments ?? []).map(localInterval).filter((item) => item.date === date).map((item) => item.interval);
	const allSlots = buildAvailableSlots({ date, durationMinutes: Number(service.duration), ...rules });
	const availableSlots = buildAvailableSlots({ date, durationMinutes: Number(service.duration), busyIntervals, ...rules });
	return {
		availableSlots,
		slots: allSlots.map((time) => ({ time, disabled: !availableSlots.includes(time) })),
	};
}

export async function GET(request: NextRequest) {
	try {
		const supabase = client();
		const serviceId = request.nextUrl.searchParams.get("serviceId");
		const employeeId = request.nextUrl.searchParams.get("employeeId");
		const date = request.nextUrl.searchParams.get("date");
		if (serviceId && employeeId && date) return NextResponse.json({ slots: (await availableSlots(supabase, employeeId, serviceId, date)).slots });
		const [services, employees, categories, categoryLinks] = await Promise.all([
			supabase.from("services").select("id, name, description, duration, price").eq("is_active", true).order("name"),
			supabase.from("employees").select("id, name").eq("is_active", true).order("name"),
			supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
			supabase.from("categories2services").select("service_id, categories_id, categories(name, is_active)"),
		]);
		if (services.error) throw services.error;
		if (employees.error) throw employees.error;
		if (categories.error) throw categories.error;
		const categoriesByService = new Map<string, string[]>();
		const categoryIdsByService = new Map<string, string[]>();
		for (const row of (categoryLinks.data ?? []) as Array<{ service_id: string | number; categories_id: string | number; categories: { name?: string; is_active?: boolean } | null }>) {
			if (!row.categories?.name || row.categories.is_active === false) continue;
			const serviceId = String(row.service_id);
			const categories = categoriesByService.get(serviceId) ?? [];
			categories.push(row.categories.name);
			categoriesByService.set(serviceId, categories);
			const categoryIds = categoryIdsByService.get(serviceId) ?? [];
			categoryIds.push(String(row.categories_id));
			categoryIdsByService.set(serviceId, categoryIds);
		}
		return NextResponse.json({
			services: (services.data ?? []).map((service) => ({
				...service,
				categories: categoriesByService.get(String(service.id)) ?? [],
				categoryIds: categoryIdsByService.get(String(service.id)) ?? [],
			})),
			employees: employees.data ?? [],
			categories: (categories.data ?? []).map((category) => ({ ...category, id: String(category.id) })),
		});
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile caricare la disponibilità." }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json() as { serviceId?: string; employeeId?: string; date?: string; time?: string; name?: string; phone?: string; email?: string };
		if (!body.serviceId || !body.employeeId || !body.date || !body.time || !body.name?.trim() || (!body.phone?.trim() && !body.email?.trim())) {
			return NextResponse.json({ error: "Completa servizio, addetto, data, orario, nome e un contatto." }, { status: 400 });
		}
		const supabase = client();
		const availability = await availableSlots(supabase, body.employeeId, body.serviceId, body.date);
		if (!availability.availableSlots.includes(body.time)) return NextResponse.json({ error: "Questo orario non è più disponibile." }, { status: 409 });
		const { data: service, error: serviceError } = await supabase.from("services").select("price, duration").eq("id", body.serviceId).single();
		if (serviceError) throw serviceError;
		const phone = body.phone?.trim() ?? ""; const email = body.email?.trim() ?? "";
		const [phoneLookup, emailLookup] = await Promise.all([
			phone ? supabase.from("customers").select("id").eq("phone", phone).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
			email ? supabase.from("customers").select("id").eq("email", email).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
		]);
		if (phoneLookup.error) throw phoneLookup.error;
		if (emailLookup.error) throw emailLookup.error;
		let customerId = (phoneLookup.data?.id ?? emailLookup.data?.id) as string | undefined;
		if (!customerId) {
			const { data, error } = await supabase.from("customers").insert({ name: body.name.trim(), phone: phone || null, email: email || null }).select("id").single();
			if (error) throw error;
			customerId = data.id;
		}
		const start = Temporal.PlainDateTime.from(`${body.date}T${body.time}`).toZonedDateTime(TIME_ZONE);
		const end = start.add({ minutes: Number(service.duration) });
		const { error } = await supabase.from("appointments").insert({ customer_id: customerId, employee_id: body.employeeId, service_id: body.serviceId, start_time: start.toInstant().toString(), end_time: end.toInstant().toString(), status: "scheduled", final_price: service.price ?? null, final_duration_minutes: Number(service.duration), appointment_source: "public" });
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile salvare la prenotazione." }, { status: 500 });
	}
}
