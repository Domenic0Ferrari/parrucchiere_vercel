"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/", label: "Home" },
	{ href: "/service", label: "Servizi" },
	{ href: "/aboutUs", label: "Chi siamo" },
	{ href: "/aboutUs#contattaci", label: "Contattaci" },
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
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-50 h-[var(--navbar-height)] w-full">
			<div className="relative h-full border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
				<nav className="flex h-full w-full items-center justify-between px-4 text-sm sm:px-6">
					<Link href="/" className="font-semibold text-zinc-900">
						Salone Online
					</Link>
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
				</nav>
				<div
					className={`absolute left-0 right-0 top-full z-50 border-b border-white/10 bg-gradient-to-b from-black/85 to-zinc-900/85 px-4 pb-4 pt-2 shadow-md backdrop-blur-xl transition duration-200 md:hidden sm:px-6 ${menuOpen
						? "translate-y-0 opacity-100"
						: "pointer-events-none -translate-y-2 opacity-0"
						}`}
				>
					<div className="space-y-1 rounded-xl border border-white/15 bg-black/35 p-3 text-sm text-zinc-100">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={`block rounded-lg px-2 py-1.5 transition hover:bg-white/10 ${getMobileMenuLinkClasses(pathname, item.href)}`}
								onClick={() => setMenuOpen(false)}
							>
								{item.label}
							</Link>
						))}
					</div>
				</div>
			</div>
		</header>
	);
}
