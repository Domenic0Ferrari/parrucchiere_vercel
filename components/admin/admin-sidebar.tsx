"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	ChevronsLeft,
	ChevronsRight,
	LayoutDashboard,
	LogOut,
	Package,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const menuItems = [
	{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/products", label: "Prodotti", icon: Package },
];

type AdminSidebarProps = {
	collapsed?: boolean;
	onToggleCollapsed?: () => void;
	isMobile?: boolean;
	onCloseMobile?: () => void;
};

export default function AdminSidebar({
	collapsed = false,
	onToggleCollapsed,
	isMobile = false,
	onCloseMobile,
}: AdminSidebarProps) {
	const pathname = usePathname();
	const router = useRouter();

	const handleLogout = async () => {
		const supabase = getSupabaseBrowserClient();
		await supabase.auth.signOut();
		onCloseMobile?.();
		router.replace("/login");
	};

	return (
		<aside className="flex h-full w-full flex-col overflow-hidden border-r border-zinc-200 bg-white">
			<div className="border-b border-zinc-200 px-4 py-4">
				<div
					className={cn(
						"flex items-center",
						collapsed && !isMobile ? "justify-center" : "justify-between"
					)}
				>
					<div className={cn(collapsed && !isMobile ? "hidden" : "block")}>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
							Admin Panel
						</p>
						<h2 className="mt-1 text-lg font-semibold text-zinc-900">Parrucchiere</h2>
					</div>

					{isMobile ? (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Chiudi menu"
							onClick={onCloseMobile}
						>
							<X className="h-4 w-4" />
						</Button>
					) : (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
							onClick={onToggleCollapsed}
						>
							{collapsed ? (
								<ChevronsRight className="h-4 w-4" />
							) : (
								<ChevronsLeft className="h-4 w-4" />
							)}
						</Button>
					)}
				</div>
			</div>

			<nav className="flex-1 space-y-1 overflow-y-auto p-4">
				{menuItems.map((item) => {
					const Icon = item.icon;
					const isActive = pathname === item.href;

					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={onCloseMobile}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
								collapsed && !isMobile ? "justify-center" : "",
								isActive
									? "bg-zinc-900 text-white"
									: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
							)}
						>
							<Icon className="h-4 w-4" />
							<span className={cn(collapsed && !isMobile ? "hidden" : "inline")}>
								{item.label}
							</span>
						</Link>
					);
				})}
			</nav>

			<div className="mt-auto p-4">
				<Button
					type="button"
					variant="outline"
					className={cn(
						"w-full gap-2 text-zinc-900",
						collapsed && !isMobile ? "justify-center px-2" : "justify-start"
					)}
					onClick={() => void handleLogout()}
				>
					<LogOut className="h-4 w-4" />
					<span className={cn(collapsed && !isMobile ? "hidden" : "inline")}>
						Logout
					</span>
				</Button>
			</div>
		</aside>
	);
}
