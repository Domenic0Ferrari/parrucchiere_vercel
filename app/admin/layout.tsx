import type { ReactNode } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { requireActiveEmployee } from "@/lib/admin-auth-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
	await requireActiveEmployee();

	return (
		<AdminShell>{children}</AdminShell>
	);
}
