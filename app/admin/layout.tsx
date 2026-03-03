import type { ReactNode } from "react";
import AdminAuthGuard from "@/components/admin/admin-auth-guard";
import AdminShell from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<AdminAuthGuard>
			<AdminShell>{children}</AdminShell>
		</AdminAuthGuard>
	);
}
