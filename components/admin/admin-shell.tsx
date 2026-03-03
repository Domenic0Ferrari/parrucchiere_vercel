"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminShell({ children }: { children: ReactNode }) {
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="h-[calc(100dvh-var(--navbar-height))] overflow-hidden bg-zinc-50">
			<div className="relative flex h-full w-full">
				<div
					className={cn(
						"hidden h-full border-r border-zinc-200 bg-white transition-[width] duration-200 md:block",
						collapsed ? "w-20" : "w-72"
					)}
				>
					<AdminSidebar
						collapsed={collapsed}
						onToggleCollapsed={() => setCollapsed((prev) => !prev)}
					/>
				</div>

				<div
					className={cn(
						"absolute inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform border-r border-zinc-200 bg-white transition-transform duration-200 md:hidden",
						mobileOpen ? "translate-x-0" : "-translate-x-full"
					)}
				>
					<AdminSidebar isMobile onCloseMobile={() => setMobileOpen(false)} />
				</div>

				{mobileOpen ? (
					<button
						type="button"
						aria-label="Close sidebar overlay"
						className="absolute inset-0 z-40 bg-black/30 md:hidden"
						onClick={() => setMobileOpen(false)}
					/>
				) : null}

				<main className="h-full flex-1 overflow-y-auto">
					<div className="sticky top-0 z-30 flex items-center border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur md:hidden">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2 text-zinc-900"
							onClick={() => setMobileOpen(true)}
						>
							<Menu className="h-4 w-4" />
							Menu
						</Button>
					</div>
					<div className="p-6 sm:p-8">{children}</div>
				</main>
			</div>
		</div>
	);
}
