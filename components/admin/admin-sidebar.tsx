"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const menuItems = [
	{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/admin/products", label: "Prodotti", icon: Package },
];

export default function AdminSidebar() {
	const pathname = usePathname();
	const router = useRouter();

	const handleLogout = async () => {
		const supabase = getSupabaseBrowserClient();
		await supabase.auth.signOut();
		router.replace("/login");
	};

	return (
		<aside className="flex h-full w-72 flex-col overflow-hidden border-r border-zinc-200 bg-white">
			<div className="border-b border-zinc-200 px-6 py-5">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
					Admin Panel
				</p>
				<h2 className="mt-2 text-lg font-semibold text-zinc-900">Parrucchiere</h2>
			</div>

			<nav className="flex-1 space-y-1 overflow-y-auto p-4">
				{menuItems.map((item) => {
					const Icon = item.icon;
					const isActive = pathname === item.href;

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
								isActive
									? "bg-zinc-900 text-white"
									: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
							)}
						>
							<Icon className="h-4 w-4" />
							{item.label}
						</Link>
					);
				})}
			</nav>

			<div className="mt-auto p-4">
				<Button
					type="button"
					variant="outline"
					className="w-full justify-start gap-2 text-zinc-900"
					onClick={() => void handleLogout()}
				>
					<LogOut className="h-4 w-4" />
					Logout
				</Button>
			</div>
		</aside>
	);
}
