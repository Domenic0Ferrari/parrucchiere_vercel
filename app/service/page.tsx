"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

type Service = {
	id: string;
	name: string;
	description: string | null;
	price: number | null;
	duration: number | null;
	categoryIds?: string[];
	categories?: string[];
	categoryDetails?: Category[];
};

type Category = { id: string; name: string; color?: string | null };

export default function ServiziPage() {
	const [selectedCategory, setSelectedCategory] = useState("tutti");
	const [services, setServices] = useState<Service[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void fetch("/api/booking")
			.then(async (response) => {
				const data = await response.json() as { services?: Service[]; categories?: Category[]; error?: string };
				if (!response.ok) throw new Error(data.error ?? "Impossibile caricare i servizi.");
				const nextCategories = data.categories ?? [];
				setCategories(nextCategories);
				setServices((data.services ?? []).map((service) => ({
					...service,
					categoryIds: service.categoryIds ?? (service.categories ?? []).flatMap((name) => {
						const category = nextCategories.find((item) => item.name.trim().toLocaleLowerCase("it-IT") === name.trim().toLocaleLowerCase("it-IT"));
						return category ? [category.id] : [];
					}),
				})));
			})
			.catch((requestError: Error) => setError(requestError.message))
			.finally(() => setLoading(false));
	}, []);

	const filteredServices = useMemo(() => services.filter((service) =>
		selectedCategory === "tutti" || (service.categoryIds ?? []).includes(selectedCategory),
	), [selectedCategory, services]);

	return (
		<div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
			<main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
				<section id="servizi" className="scroll-mt-24">
					<header className="max-w-2xl">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
							I nostri servizi
						</p>
						<h1 className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
							Servizi pensati per valorizzare il tuo stile
						</h1>
						<p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
							Tagli, colore e styling su misura. Prezzi indicativi: la durata può variare in base a lunghezza e consulenza.
						</p>
					</header>

					<div className="mt-4 flex flex-wrap gap-2">
						<FilterButton
							label="Tutti"
							active={selectedCategory === "tutti"}
							onClick={() => setSelectedCategory("tutti")}
						/>
						{categories.map((category) => (
							<FilterButton
								key={category.id}
								label={category.name}
								active={selectedCategory === category.id}
								onClick={() => setSelectedCategory(category.id)}
							/>
						))}
					</div>

					<div className="mt-6 grid gap-5 md:grid-cols-3">
						{loading ? <LoadingIndicator className="min-h-40 md:col-span-3" label="Caricamento servizi..." /> : null}
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
						{!loading && !error && filteredServices.length === 0 ? <p className="text-sm text-zinc-600">Nessun servizio disponibile.</p> : null}
						{filteredServices.map((service) => (
							<ServiceCard
								key={service.id}
								title={service.name}
								description={service.description}
								price={service.price}
								duration={service.duration}
								categories={service.categoryDetails ?? []}
							/>
						))}
					</div>
				</section>
			</main>
		</div>
	);
}

function FilterButton(props: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={props.onClick}
			className={`rounded-full px-4 py-2 text-xs font-semibold transition ${props.active
				? "bg-zinc-900 text-white"
				: "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
				}`}
		>
			{props.label}
		</button>
	);
}

function ServiceCard(props: {
	title: string;
	description: string | null;
	price: number | null;
	duration: number | null;
	categories: Category[];
}) {
	const handleStartBooking = () => {
		if (typeof window === "undefined") return;
		window.sessionStorage.setItem(
			"booking_access_token",
			JSON.stringify({
				service: props.title,
			}),
		);
	};

	return (
		<article className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
			<div className="space-y-2">
				<div className="flex min-h-5 justify-between gap-2">
					<h3 className="text-sm font-semibold text-zinc-900">{props.title}</h3>
					{props.categories.length > 0 ? (
						<div className="flex flex-wrap justify-end gap-1">
							{props.categories.map((category) => (
								<span
									key={category.id}
									className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
									style={{ backgroundColor: isHexColor(category.color) ? category.color : "#6F929C" }}
								>
									{category.name}
								</span>
							))}
						</div>
					) : null}
				</div>
				<p className="text-xs leading-relaxed text-zinc-600">
					{props.description || "Dettagli disponibili in salone."}
				</p>
				{props.duration !== null ? <p className="text-xs text-zinc-500">Durata: {props.duration} min</p> : null}
			</div>
			<div className="mt-4 grid grid-cols-4 gap-2">
				<Link
					href={{ pathname: "/book", query: { servizio: props.title } }}
					onClick={handleStartBooking}
					className="col-span-3 inline-flex items-center justify-center rounded-full bg-zinc-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800"
				>
					Prenota
				</Link>
				<div className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-2 py-2 text-center text-[11px] font-semibold text-zinc-800">
					{props.price !== null ? `€ ${props.price.toFixed(2)}` : "Su richiesta"}
				</div>
			</div>
		</article>
	);
}

function isHexColor(value: string | null | undefined): value is string {
	return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
