import "server-only";

import { serviceClient } from "@/lib/customer-account";

export async function ownedAppointment(id: string, customerId: string) {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
	const { data, error } = await serviceClient().from("appointments")
		.select("id, customer_id, service_id, employee_id, start_time, end_time, status, final_price, final_duration_minutes")
		.eq("id", id).eq("customer_id", customerId).maybeSingle();
	if (error) throw error;
	return data;
}
