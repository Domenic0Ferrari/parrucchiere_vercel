import { NextRequest, NextResponse } from "next/server";
import { CustomerAccountError, getCustomerAccount, serviceClient } from "@/lib/customer-account";
import { canCustomerChange, changeCutoff } from "@/lib/customer-appointment-domain";
import { ownedAppointment } from "@/lib/owned-appointment";
import { isSameOriginRequest } from "@/lib/booking-security";
import { sendCustomerAppointmentEmail } from "@/lib/customer-appointment-email";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
	try {
		const customer = await getCustomerAccount();
		const { id } = await context.params;
		const current = await ownedAppointment(id, customer.id);
		if (!current) return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
		if (!canCustomerChange(current.start_time, current.status)) return NextResponse.json({ error: "Non puoi annullare nelle 24 ore precedenti l'appuntamento." }, { status: 409 });
		const db = serviceClient();
		const { data, error } = await db.from("appointments")
			.update({ status: "cancelled", updated_at: new Date().toISOString() })
			.eq("id", id).eq("customer_id", customer.id).eq("status", "scheduled")
			.eq("start_time", current.start_time).gte("start_time", changeCutoff().toString())
			.select("id").maybeSingle();
		if (error) throw error;
		if (!data) return NextResponse.json({ error: "La prenotazione è cambiata. Ricarica la pagina." }, { status: 409 });
		const [service, employee] = await Promise.all([
			db.from("services").select("name").eq("id", current.service_id).maybeSingle(),
			db.from("employees").select("name").eq("id", current.employee_id).maybeSingle(),
		]);
		try {
			await sendCustomerAppointmentEmail({ type: "cancelled", to: customer.email, name: customer.name, service: service.data?.name ?? "Servizio", employee: employee.data?.name ?? "Addetto", startTime: current.start_time, endTime: current.end_time, price: current.final_price });
		} catch (emailError) { console.error("Customer booking cancellation email error:", emailError); }
		return NextResponse.json({ ok: true });
	} catch (error) {
		if (error instanceof CustomerAccountError) return NextResponse.json({ error: error.message }, { status: error.status });
		console.error("Customer booking cancellation error:", error);
		return NextResponse.json({ error: "Impossibile annullare la prenotazione." }, { status: 500 });
	}
}
