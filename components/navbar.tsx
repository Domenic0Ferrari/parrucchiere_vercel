"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navItems = [
	{ href: "/", label: "Home" },
	{ href: "/service", label: "Servizi" },
	{ href: "/aboutUs", label: "Chi siamo" },
	{ href: "/contacts", label: "Contattaci" },
];

function getLinkClasses(pathname: string, href: string): string {
	const isHashLink = href.includes("#");
	const cleanHref = href.split("#")[0];
	const isActive = !isHashLink && pathname === cleanHref;

	return isActive
		? "font-semibold text-zinc-900"
		: "text-zinc-700 transition hover:text-zinc-900";
}

function getMobileMenuLinkClasses(pathname: string, href: string): string {
	const isHashLink = href.includes("#");
	const cleanHref = href.split("#")[0];
	const isActive = !isHashLink && pathname === cleanHref;

	return isActive
		? "font-semibold text-white"
		: "text-zinc-200 transition hover:text-white";
}

export default function Navbar() {
	const [menuOpen, setMenuOpen] = useState(false);
	const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
	const pathname = usePathname();
	const isAdminRoute = pathname.startsWith("/admin");

	useEffect(() => {
		if (!isAdminRoute) return;

		const handleSidebarState = (event: Event) => {
			const customEvent = event as CustomEvent<{ open?: boolean }>;
			setAdminSidebarOpen(Boolean(customEvent.detail?.open));
		};

		window.addEventListener("admin-sidebar-state", handleSidebarState);
		return () => {
			window.removeEventListener("admin-sidebar-state", handleSidebarState);
		};
	}, [isAdminRoute]);

	useEffect(() => {
		if (isAdminRoute || !menuOpen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isAdminRoute, menuOpen]);

	const handleAdminSidebarToggle = () => {
		window.dispatchEvent(new CustomEvent("admin-sidebar-toggle"));
	};

	return (
		<header className="sticky top-0 z-50 h-[var(--navbar-height)] w-full">
			<div className="relative h-full border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
				<nav
					className="flex h-full w-full items-center justify-between px-4 text-sm sm:px-6"
				>
					<Link
						href={isAdminRoute ? "/admin/dashboard" : "/"}
						className="flex items-center gap-2 font-semibold text-zinc-900"
					>
						<Image
							src="/logo.png"
							alt=""
							width={36}
							height={36}
							className="size-9 object-contain"
						/>
					</Link>
					{isAdminRoute ? (
						<button
							type="button"
							className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white p-2 text-zinc-800 shadow-sm transition hover:bg-zinc-100"
							aria-label={adminSidebarOpen ? "Chiudi sidebar" : "Apri sidebar"}
							onClick={handleAdminSidebarToggle}
						>
							{adminSidebarOpen ? (
								<X className="h-4 w-4" />
							) : (
								<Menu className="h-4 w-4" />
							)}
						</button>
					) : null}
					{isAdminRoute ? null : (
						<div className="hidden items-center gap-6 md:flex">
							{navItems.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									className={getLinkClasses(pathname, item.href)}
								>
									{item.label}
								</Link>
							))}
						</div>
					)}
					{isAdminRoute ? null : (
						<button
							type="button"
							className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white p-2 text-zinc-800 shadow-sm transition hover:bg-zinc-100 md:hidden"
							aria-label="Apri il menu"
							onClick={() => setMenuOpen((open) => !open)}
						>
							<span className="sr-only">Apri il menu</span>
							<div className="space-y-1.5">
								<span className="block h-0.5 w-5 bg-zinc-700" />
								<span className="block h-0.5 w-5 bg-zinc-700" />
								<span className="block h-0.5 w-5 bg-zinc-700" />
							</div>
						</button>
					)}
					</nav>
				</div>
				{!isAdminRoute && menuOpen ? (
					<div className="fixed inset-0 z-[9999] bg-brand text-white md:hidden">
						<div className="mobile-menu-enter flex min-h-[100dvh] flex-col px-6 py-6">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3 text-sm font-semibold tracking-wide">
									<div className="flex size-12 items-center justify-center rounded-full bg-white/90 shadow-sm">
										<Image src="/logo.png" alt="" width={40} height={40} className="size-9 object-contain" />
									</div>
									{/* <span>Salone Online</span> */}
								</div>
								<button type="button" onClick={() => setMenuOpen(false)} aria-label="Chiudi il menu" className="inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 transition hover:bg-white/20">
									<X className="size-5" />
								</button>
							</div>
							<nav className="my-auto flex flex-col gap-2 py-10" aria-label="Navigazione principale">
								{navItems.map((item, index) => (
									<Link
										key={item.href}
										href={item.href}
										className={`mobile-menu-link rounded-2xl px-4 py-4 text-2xl font-semibold ${getMobileMenuLinkClasses(pathname, item.href)}`}
										style={{ animationDelay: `${80 + index * 55}ms` }}
										onClick={() => setMenuOpen(false)}
									>
										{item.label}
									</Link>
								))}
							</nav>
							<Link href="/service" onClick={() => setMenuOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition hover:bg-zinc-100">Prenota</Link>
						</div>
					</div>
					) : null}
		</header>
	);
}
