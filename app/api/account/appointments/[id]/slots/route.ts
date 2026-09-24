import { NextRequest, NextResponse } from "next/server";
import { CustomerAccountError, getCustomerAccount } from "@/lib/customer-account";
import { canCustomerChange, customerAvailableSlots, parseChangeInput } from "@/lib/customer-appointment-domain";
import { ownedAppointment } from "@/lib/owned-appointment";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const customer = await getCustomerAccount();
		const { id } = await context.params;
		const appointment = await ownedAppointment(id, customer.id);
		if (!appointment) return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
		if (!canCustomerChange(appointment.start_time, appointment.status)) return NextResponse.json({ error: "La prenotazione non è più modificabile." }, { status: 409 });
		const input = parseChangeInput({
			serviceId: request.nextUrl.searchParams.get("serviceId"),
			employeeId: request.nextUrl.searchParams.get("employeeId"),
			date: request.nextUrl.searchParams.get("date"), time: "12:00",
		});
		if (!input) return NextResponse.json({ error: "Parametri non validi." }, { status: 400 });
		const sameService = String(appointment.service_id) === input.serviceId;
		const durationOverride = sameService && Number.isSafeInteger(appointment.final_duration_minutes) && appointment.final_duration_minutes > 0
			? appointment.final_duration_minutes : undefined;
		const availability = await customerAvailableSlots({ appointmentId: id, serviceId: input.serviceId, employeeId: input.employeeId, date: input.date, durationOverride });
		return NextResponse.json({ slots: availability?.slots ?? [] }, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		if (error instanceof CustomerAccountError) return NextResponse.json({ error: error.message }, { status: error.status });
		console.error("Customer booking slots error:", error);
		return NextResponse.json({ error: "Impossibile caricare gli orari." }, { status: 500 });
	}
}
