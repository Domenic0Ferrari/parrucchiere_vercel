"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, History, LayoutDashboard, LogOut, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

const navigation = [
	{ href: "/account/bookings", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/account/history", label: "Storico", icon: History },
];

type CustomerPortalShellProps = {
	profile: { name: string; email: string } | null;
	children: ReactNode;
};

export function CustomerPortalShell({ profile, children }: CustomerPortalShellProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		const handleSidebarToggle = () => setMobileOpen((open) => !open);
		window.addEventListener("customer-sidebar-toggle", handleSidebarToggle);
		return () => window.removeEventListener("customer-sidebar-toggle", handleSidebarToggle);
	}, []);

	useEffect(() => {
		window.dispatchEvent(new CustomEvent("customer-sidebar-state", { detail: { open: mobileOpen } }));
	}, [mobileOpen]);

	async function signOut() {
		await getSupabaseBrowserClient().auth.signOut();
		setMobileOpen(false);
		router.replace("/account/login");
		router.refresh();
	}

	const sidebar = (
		<aside className="flex h-full flex-col bg-white">
			<div className="border-b border-zinc-200 px-5 py-5">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Area clienti</p>
				<p className="mt-2 truncate font-semibold text-zinc-900">{profile?.name ?? "Il tuo profilo"}</p>
				<p className="mt-0.5 truncate text-sm text-zinc-500">{profile?.email ?? "Caricamento..."}</p>
			</div>
			<nav className="flex-1 space-y-1 p-3" aria-label="Area clienti">
				{navigation.map(({ href, label, icon: Icon }) => (
					<Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition", pathname === href ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100")}> 
						<Icon className="size-4" />{label}
					</Link>
				))}
			</nav>
			<div className="border-t border-zinc-200 p-3">
				<Link href="/book?from=account" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"><CalendarDays className="size-4" />Nuova prenotazione</Link>
				<button type="button" onClick={() => void signOut()} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"><LogOut className="size-4" />Esci</button>
			</div>
		</aside>
	);

	return <div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 md:flex">
		<div className="hidden w-64 shrink-0 border-r border-zinc-200 md:block">{sidebar}</div>
		<div className="flex min-w-0 flex-1 flex-col">
			<main className="flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-10">{children}</main>
		</div>
		{mobileOpen ? <div className="fixed inset-0 z-[60] md:hidden"><button type="button" aria-label="Chiudi menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/30" /><div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-zinc-200 bg-white shadow-xl"><button type="button" onClick={() => setMobileOpen(false)} aria-label="Chiudi menu area clienti" className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"><X className="size-5" /></button>{sidebar}</div></div> : null}
	</div>;
}
