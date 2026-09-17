"use client";

import { useEffect, useState, type ComponentType } from "react";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

type SalonContact = {
	name: string;
	email: string;
	phone: string;
	address: string;
};

type ContactItemProps = {
	label: string;
	value: string;
	href?: string;
	action: string;
	Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	external?: boolean;
};

function ContactItem({ label, value, href, action, Icon, external }: ContactItemProps) {
	const content = (
		<>
			<div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
				<Icon aria-hidden={true} className="size-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-xs font-medium text-zinc-500">{label}</p>
				<p className="mt-1 break-words text-sm font-semibold text-zinc-900">{value || "Non disponibile"}</p>
			</div>
			{href ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand"><span className="hidden sm:inline">{action}</span><ArrowUpRight aria-hidden="true" className="size-4" /></span> : null}
		</>
	);

	if (!href) return <div className="flex min-w-0 items-center gap-4 rounded-xl bg-zinc-50 p-4 sm:p-5">{content}</div>;

	return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="group flex min-w-0 items-center gap-4 rounded-xl bg-zinc-50 p-4 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/35 sm:p-5">{content}</a>;
}

export default function ContactsPage() {
	const [salon, setSalon] = useState<SalonContact | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		void fetch("/api/salon")
			.then(async (response) => {
				const data = await response.json() as { salon?: SalonContact | null; error?: string };
				if (!response.ok) throw new Error(data.error ?? "Impossibile caricare i contatti.");
				setSalon(data.salon ?? null);
			})
			.catch(() => setSalon(null))
			.finally(() => setLoading(false));
	}, []);

	const phone = salon?.phone ?? "";
	const email = salon?.email ?? "";
	const address = salon?.address ?? "";
	const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : undefined;
	const emailHref = email ? `mailto:${email}` : undefined;
	const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined;

	return (
		<div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 text-zinc-900">
			<main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
				<header className="max-w-2xl">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Contatti</p>
					<h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{salon?.name ? `Contatta ${salon.name}` : "Parliamo del tuo prossimo look"}</h1>
					<p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">Per informazioni, disponibilità o per fissare un appuntamento, scegli il canale che preferisci.</p>
				</header>

				<section className="mt-7 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Informazioni di contatto">
					{loading ? <LoadingIndicator className="min-h-48" label="Caricamento contatti..." /> : <div className="grid gap-3"><ContactItem label="Telefono" value={phone} href={phoneHref} action="Chiama" Icon={Phone} /><ContactItem label="Email" value={email} href={emailHref} action="Scrivi" Icon={Mail} /><ContactItem label="Indirizzo" value={address} href={mapsUrl} action="Indicazioni" Icon={MapPin} external /></div>}
				</section>
			</main>
		</div>
	);
}
