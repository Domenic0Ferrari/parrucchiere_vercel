"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Service = {
	id: string;
	name: string;
	description: string | null;
	price: number | null;
	duration: number | null;
	categoryIds?: string[];
	categories?: string[];
};

type Category = { id: string; name: string };

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
			<div className="relative h-[280px] w-full overflow-hidden sm:h-[380px] lg:h-[460px]">
				<Image
					src="/capelli_servizi.jpg"
					alt="capelli_servizi"
					fill
					priority
					quality={100}
					sizes="100vw"
					className="absolute inset-0 h-full w-full object-cover object-center"
				/>
				<div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />

				<div
					id="home"
					className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-4 pb-10 pt-24 sm:px-6"
				>
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">
						I NOSTRI SERVIZI
					</p>
					<h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl text-zinc-300">
						Servizi pensati per valorizzare il tuo stile
					</h1>
					<p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-200 sm:text-base">
						Tagli, colore e styling su misura. Scegli il trattamento e prenota
						in pochi clic.
					</p>
				</div>
			</div>

			<main className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
				<section id="servizi" className="scroll-mt-24">
					<h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
						Servizi
					</h2>
					<p className="mt-1 max-w-2xl text-sm text-zinc-600">
						Prezzi indicativi. La durata puo variare in base a lunghezza e
						consulenza.
					</p>

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
						{loading ? <p className="text-sm text-zinc-600">Caricamento servizi...</p> : null}
						{error ? <p className="text-sm text-red-600">{error}</p> : null}
						{!loading && !error && filteredServices.length === 0 ? <p className="text-sm text-zinc-600">Nessun servizio disponibile.</p> : null}
						{filteredServices.map((service) => (
							<ServiceCard
								key={service.id}
								title={service.name}
								description={service.description}
								price={service.price}
								duration={service.duration}
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
				<h3 className="text-sm font-semibold text-zinc-900">{props.title}</h3>
				<p className="text-xs leading-relaxed text-zinc-600">
					{props.description || "Dettagli disponibili in salone."}
				</p>
				<p className="text-xs font-medium text-zinc-800">
					{props.price !== null ? `EUR ${props.price.toFixed(2)}` : "Prezzo su richiesta"}
					{props.duration !== null ? ` - ${props.duration} min` : ""}
				</p>
			</div>
			<Link
				href={{
					pathname: "/book",
					query: { servizio: props.title },
				}}
				onClick={handleStartBooking}
				className="mt-4 inline-flex w-fit items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800"
			>
				Prenota
			</Link>
		</article>
	);
}
