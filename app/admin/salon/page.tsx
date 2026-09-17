"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarOff, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/employee-session-provider";

const salonAreas = [
	{
		title: "Dati salone",
		description: "Nome, email, telefono e indirizzo visibili ai clienti.",
		href: "/admin/salon/details",
		icon: Building2,
	},
	{
		title: "Orari di apertura",
		description: "Fasce settimanali, pause e giorni di chiusura ordinari.",
		href: "/admin/salon/hours",
		icon: Clock3,
	},
	{
		title: "Chiusure extra",
		description: "Ferie, festività e indisponibilità occasionali.",
		href: "/admin/salon/closures",
		icon: CalendarOff,
	},
];

export default function AdminSalonPage() {
	const router = useRouter();
	const { user, isLoading } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";

	useEffect(() => {
		if (!isLoading && !isAdmin) router.replace("/admin/dashboard");
	}, [isAdmin, isLoading, router]);

	if (isLoading || !isAdmin) return null;

	return (
		<section>
			<header className="max-w-2xl">
				<h1 className="text-2xl font-semibold text-zinc-900">Salone</h1>
				<p className="mt-1 text-sm text-zinc-600">
					Scegli l’area che vuoi consultare o modificare.
				</p>
			</header>

			<div className="mt-6 grid gap-4 md:grid-cols-3">
				{salonAreas.map((area) => {
					const Icon = area.icon;
					return (
						<article key={area.href} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
							<div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-brand">
								<Icon aria-hidden="true" className="size-5" />
							</div>
							<h2 className="mt-5 text-lg font-semibold text-zinc-900">{area.title}</h2>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600">{area.description}</p>
							<Link href={area.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover">
								Gestisci <ArrowRight aria-hidden="true" className="size-4" />
							</Link>
						</article>
					);
				})}
			</div>
		</section>
	);
}
