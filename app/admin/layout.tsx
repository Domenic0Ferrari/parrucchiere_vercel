import type { ReactNode } from "react";
import AdminAuthGuard from "@/components/admin/admin-auth-guard";
import AdminSidebar from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<AdminAuthGuard>
			<div className="h-[calc(100dvh-var(--navbar-height))] overflow-hidden bg-zinc-50">
				<div className="flex h-full w-full">
					<AdminSidebar />
					<main className="h-full flex-1 overflow-y-auto p-6 sm:p-8">{children}</main>
				</div>
			</div>
		</AdminAuthGuard>
	);
}
