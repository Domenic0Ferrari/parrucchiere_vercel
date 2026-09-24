import { NextRequest, NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { CustomerAccountError, getCustomerAccount, serviceClient } from "@/lib/customer-account";
import { canCustomerChange, changeCutoff, customerAvailableSlots, CUSTOMER_TIME_ZONE, parseChangeInput } from "@/lib/customer-appointment-domain";
import { ownedAppointment } from "@/lib/owned-appointment";
import { isSameOriginRequest } from "@/lib/booking-security";
import { sendCustomerAppointmentEmail } from "@/lib/customer-appointment-email";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
	try {
		if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Formato non valido." }, { status: 415 });
		const raw = await request.text();
		if (raw.length > 4096) return NextResponse.json({ error: "Richiesta troppo grande." }, { status: 413 });
		const input = parseChangeInput(JSON.parse(raw));
		if (!input) return NextResponse.json({ error: "Selezione non valida." }, { status: 400 });
		const customer = await getCustomerAccount();
		const { id } = await context.params;
		const current = await ownedAppointment(id, customer.id);
		if (!current) return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
		if (!canCustomerChange(current.start_time, current.status)) return NextResponse.json({ error: "La prenotazione non è più modificabile nelle 24 ore precedenti." }, { status: 409 });
		const sameService = String(current.service_id) === input.serviceId;
		const durationOverride = sameService && Number.isSafeInteger(current.final_duration_minutes) && current.final_duration_minutes > 0
			? current.final_duration_minutes : undefined;
		const availability = await customerAvailableSlots({ appointmentId: id, serviceId: input.serviceId, employeeId: input.employeeId, date: input.date, durationOverride });
		if (!availability || !availability.available.has(input.time)) return NextResponse.json({ error: "Questo orario non è più disponibile." }, { status: 409 });
		const start = Temporal.PlainDateTime.from(`${input.date}T${input.time}`).toZonedDateTime(CUSTOMER_TIME_ZONE).toInstant();
		const end = start.add({ minutes: availability.duration });
		const db = serviceClient();
		const { data, error } = await db.from("appointments").update({
			service_id: input.serviceId, employee_id: input.employeeId,
			start_time: start.toString(), end_time: end.toString(),
			final_duration_minutes: availability.duration,
			final_price: sameService ? current.final_price : availability.service.price,
			updated_at: new Date().toISOString(),
		}).eq("id", id).eq("customer_id", customer.id).eq("status", "scheduled")
			.eq("start_time", current.start_time).gte("start_time", changeCutoff().toString())
			.select("id, start_time, end_time, final_price, final_duration_minutes").maybeSingle();
		if (error?.code === "23P01") return NextResponse.json({ error: "Orario appena occupato. Scegline un altro." }, { status: 409 });
		if (error) throw error;
		if (!data) return NextResponse.json({ error: "La prenotazione è cambiata. Ricarica la pagina." }, { status: 409 });
		try {
			await sendCustomerAppointmentEmail({ type: "changed", to: customer.email, name: customer.name, service: availability.service.name, employee: availability.employee.name, startTime: data.start_time, endTime: data.end_time, price: data.final_price });
		} catch (emailError) { console.error("Customer booking change email error:", emailError); }
		return NextResponse.json({ ok: true });
	} catch (error) {
		if (error instanceof CustomerAccountError) return NextResponse.json({ error: error.message }, { status: error.status });
		if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
		console.error("Customer booking change error:", error);
		return NextResponse.json({ error: "Impossibile modificare la prenotazione." }, { status: 500 });
	}
}
