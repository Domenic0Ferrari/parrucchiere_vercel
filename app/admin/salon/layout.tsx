import type { ReactNode } from "react";
import { requireAdminEmployee } from "@/lib/admin-auth-server";

export default async function AdminSalonLayout({ children }: { children: ReactNode }) {
	await requireAdminEmployee();
	return children;
}
