import { NextRequest, NextResponse } from "next/server";
import { CustomerAccountError, getCustomerAccount, serviceClient } from "@/lib/customer-account";
import { canCustomerChange } from "@/lib/customer-appointment-domain";

export async function GET(request: NextRequest) {
	try {
		const customer = await getCustomerAccount();
		const page = Math.max(0, Math.min(100, Number.parseInt(request.nextUrl.searchParams.get("page") ?? "0", 10) || 0));
		const db = serviceClient();
		const { data, error } = await db.from("appointments")
			.select("id, service_id, employee_id, start_time, end_time, status, final_price, final_duration_minutes, appointment_source")
			.eq("customer_id", customer.id).order("start_time", { ascending: false }).range(page * 20, page * 20 + 20);
		if (error) throw error;
		const rows = data ?? [];
		const serviceIds = [...new Set(rows.map((row) => String(row.service_id)))];
		const employeeIds = [...new Set(rows.map((row) => String(row.employee_id)))];
		const [services, employees] = await Promise.all([
			serviceIds.length ? db.from("services").select("id, name").in("id", serviceIds) : Promise.resolve({ data: [], error: null }),
			employeeIds.length ? db.from("employees").select("id, name").in("id", employeeIds) : Promise.resolve({ data: [], error: null }),
		]);
		if (services.error) throw services.error;
		if (employees.error) throw employees.error;
		const names = new Map((services.data ?? []).map((row) => [String(row.id), row.name]));
		const employeeNames = new Map((employees.data ?? []).map((row) => [String(row.id), row.name]));
		return NextResponse.json({
			customer: { name: customer.name, email: customer.email, phone: customer.phone },
			appointments: rows.slice(0, 20).map((row) => ({
				id: row.id, serviceId: String(row.service_id), employeeId: String(row.employee_id),
				serviceName: names.get(String(row.service_id)) ?? "Servizio", employeeName: employeeNames.get(String(row.employee_id)) ?? "Addetto",
				startTime: row.start_time, endTime: row.end_time, status: row.status,
				price: row.final_price, durationMinutes: row.final_duration_minutes, source: row.appointment_source,
				canChange: canCustomerChange(row.start_time, row.status),
			})),
			hasMore: rows.length > 20,
		}, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		if (error instanceof CustomerAccountError) return NextResponse.json({ error: error.message }, { status: error.status });
		console.error("Customer appointments error:", error);
		return NextResponse.json({ error: "Impossibile caricare le prenotazioni." }, { status: 500 });
	}
}
