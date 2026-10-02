import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { sendAppointmentReminderEmail } from "@/lib/appointment-reminder-email";

const TIME_ZONE = "Europe/Rome";

type Appointment = {
	id: string;
	customer_id: string;
	service_id: string;
	employee_id: string;
	start_time: string;
	end_time: string;
	final_price: number | string | null;
};

function serviceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Configurazione Supabase mancante.");
	return createClient(url, key, { auth: { persistSession: false } });
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const secret = process.env.CRON_SECRET;
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
		return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
	}

	try {
		const supabase = serviceClient();
		const tomorrow = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate().add({ days: 1 });
		const dayStart = tomorrow.toZonedDateTime(TIME_ZONE).toInstant().toString();
		const dayEnd = tomorrow.add({ days: 1 }).toZonedDateTime(TIME_ZONE).toInstant().toString();
		const { data: appointments, error: appointmentsError } = await supabase
			.from("appointments")
			.select("id, customer_id, service_id, employee_id, start_time, end_time, final_price")
			.eq("status", "scheduled")
			.gte("start_time", dayStart)
			.lt("start_time", dayEnd)
			.limit(100);
		if (appointmentsError) throw appointmentsError;
		const pending = (appointments ?? []) as Appointment[];
		if (pending.length === 0) return NextResponse.json({ ok: true, targetDate: tomorrow.toString(), sent: 0, skipped: 0, failed: 0 });

		const ids = pending.map((appointment) => appointment.id);
		const [notificationsResult, customersResult, servicesResult, employeesResult] = await Promise.all([
			supabase.from("appointment_notifications").select("appointment_id").eq("kind", "reminder_next_day").in("appointment_id", ids),
			supabase.from("customers").select("id, name, email").in("id", [...new Set(pending.map((appointment) => appointment.customer_id))]),
			supabase.from("services").select("id, name").in("id", [...new Set(pending.map((appointment) => appointment.service_id))]),
			supabase.from("employees").select("id, name").in("id", [...new Set(pending.map((appointment) => appointment.employee_id))]),
		]);
		if (notificationsResult.error) throw notificationsResult.error;
		if (customersResult.error) throw customersResult.error;
		if (servicesResult.error) throw servicesResult.error;
		if (employeesResult.error) throw employeesResult.error;

		const alreadySent = new Set((notificationsResult.data ?? []).map((notification) => notification.appointment_id));
		const customers = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer]));
		const services = new Map((servicesResult.data ?? []).map((service) => [service.id, service]));
		const employees = new Map((employeesResult.data ?? []).map((employee) => [employee.id, employee]));
		let sent = 0;
		let skipped = 0;
		let failed = 0;

		for (const appointment of pending) {
			if (alreadySent.has(appointment.id)) continue;
			const customer = customers.get(appointment.customer_id);
			const service = services.get(appointment.service_id);
			const employee = employees.get(appointment.employee_id);
			if (!customer?.email || !service?.name || !employee?.name) {
				skipped += 1;
				continue;
			}
			const { error: claimError } = await supabase.from("appointment_notifications").insert({ appointment_id: appointment.id, kind: "reminder_next_day" });
			if (claimError?.code === "23505") continue;
			if (claimError) throw claimError;
			try {
				const delivered = await sendAppointmentReminderEmail({ to: customer.email, customerName: customer.name, serviceName: service.name, employeeName: employee.name, startTime: appointment.start_time, endTime: appointment.end_time, price: appointment.final_price });
				if (delivered) sent += 1;
				else {
					skipped += 1;
					await supabase.from("appointment_notifications").delete().eq("appointment_id", appointment.id).eq("kind", "reminder_next_day");
				}
			} catch (error) {
				failed += 1;
				console.error("Appointment reminder email error:", { appointmentId: appointment.id, error });
				await supabase.from("appointment_notifications").delete().eq("appointment_id", appointment.id).eq("kind", "reminder_next_day");
			}
		}

		return NextResponse.json({ ok: true, targetDate: tomorrow.toString(), sent, skipped, failed });
	} catch (error) {
		console.error("Appointment reminder cron error:", error);
		return NextResponse.json({ error: "Impossibile eseguire i reminder." }, { status: 500 });
	}
}
