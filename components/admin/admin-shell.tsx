"use client";

import { useEffect, useState, type ReactNode } from "react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";

export default function AdminShell({ children }: { children: ReactNode }) {
	const [desktopExpanded, setDesktopExpanded] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		const handleSidebarToggle = () => {
			if (window.matchMedia("(max-width: 767px)").matches) {
				setMobileOpen((prev) => !prev);
			}
		};

		window.addEventListener("admin-sidebar-toggle", handleSidebarToggle);
		return () => {
			window.removeEventListener("admin-sidebar-toggle", handleSidebarToggle);
		};
	}, []);

	useEffect(() => {
		window.dispatchEvent(
			new CustomEvent("admin-sidebar-state", { detail: { open: mobileOpen } })
		);
	}, [mobileOpen]);

	return (
		<div className="h-[calc(100dvh-var(--navbar-height))] overflow-hidden bg-zinc-50">
			<div className="relative h-full w-full">
				<div
					className={cn(
						"absolute inset-y-0 left-0 z-30 hidden border-r border-zinc-200 bg-white transition-[width] duration-200 md:block",
						desktopExpanded ? "w-72" : "w-20"
					)}
					onMouseEnter={() => setDesktopExpanded(true)}
					onMouseLeave={() => setDesktopExpanded(false)}
				>
					<AdminSidebar collapsed={!desktopExpanded} />
				</div>

				<main className="h-full overflow-y-auto md:ml-20">
					<div className="p-6 sm:p-8">{children}</div>
				</main>

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
			</div>
		</div>
	);
}