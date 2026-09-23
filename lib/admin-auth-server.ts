import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { EmployeeProfile } from "@/lib/employee-session";

export const getActiveEmployee = cache(async (): Promise<EmployeeProfile | null> => {
	const supabase = await createSupabaseServerClient();
	const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
	const authUserId = claimsData?.claims?.sub;
	if (claimsError || !authUserId) return null;

	const { data: employee, error } = await supabase
		.from("employees")
		.select("id, auth_user_id, name, is_active, role")
		.eq("auth_user_id", authUserId)
		.eq("is_active", true)
		.maybeSingle();

	if (error || !employee) return null;
	if (employee.role !== "staff" && employee.role !== "admin") return null;
	return employee as EmployeeProfile;
});

export async function requireActiveEmployee() {
	const employee = await getActiveEmployee();
	if (!employee) redirect("/login");
	return employee;
}

export async function requireAdminEmployee() {
	const employee = await requireActiveEmployee();
	if (employee.role !== "admin") redirect("/admin/dashboard");
	return employee;
}
