"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type ServiceCategory = "tutti" | "donna" | "uomo";

const services = [
	{
		title: "Taglio e piega",
		description:
			"Consulenza, shampoo specifico e styling finale per un risultato naturale e duraturo.",
		price: "Da 35 EUR",
		duration: "45-60 min",
		category: "donna",
	},
	{
		title: "Colore (radici / completo)",
		description:
			"Tonalita personalizzata, protezione e finitura luminosa con prodotti selezionati.",
		price: "Da 45 EUR",
		duration: "60-90 min",
		category: "donna",
	},
	{
		title: "Piega e styling",
		description:
			"Onde, liscio o volumizzante: scegli lo styling perfetto per la tua occasione.",
		price: "Da 30 EUR",
		duration: "30-60 min",
		category: "donna",
	},
	{
		title: "Trattamento rigenerante",
		description:
			"Nutrizione profonda e ricostruzione per capelli stressati o trattati.",
		price: "Da 25 EUR",
		duration: "20-40 min",
		category: "tutti",
	},
	{
		title: "Schiariture / balayage",
		description:
			"Effetto naturale e sfumato, studiato sul tuo viso e sul tuo colore di base.",
		price: "Da 80 EUR",
		duration: "120-180 min",
		category: "donna",
	},
	{
		title: "Raccolti e cerimonia",
		description:
			"Raccolto elegante e fissaggio professionale per eventi e cerimonie.",
		price: "Da 55 EUR",
		duration: "60-90 min",
		category: "donna",
	},
	{
		title: "Taglio uomo",
		description:
			"Taglio personalizzato con rifinitura professionale e finish adatto al tuo stile.",
		price: "Da 22 EUR",
		duration: "30-45 min",
		category: "uomo",
	},
	{
		title: "Barba e grooming",
		description:
			"Definizione barba, contorni precisi e trattamento lenitivo post-servizio.",
		price: "Da 18 EUR",
		duration: "20-30 min",
		category: "uomo",
	},
] as const;

export default function ServiziPage() {
	const [selectedCategory, setSelectedCategory] =
		useState<ServiceCategory>("tutti");

	const filteredServices = services.filter(
		(service) =>
			selectedCategory === "tutti" ||
			service.category === "tutti" ||
			service.category === selectedCategory,
	);

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
						<FilterButton
							label="Donna"
							active={selectedCategory === "donna"}
							onClick={() => setSelectedCategory("donna")}
						/>
						<FilterButton
							label="Uomo"
							active={selectedCategory === "uomo"}
							onClick={() => setSelectedCategory("uomo")}
						/>
					</div>

					<div className="mt-6 grid gap-5 md:grid-cols-3">
						{filteredServices.map((service) => (
							<ServiceCard
								key={service.title}
								title={service.title}
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
	description: string;
	price: string;
	duration: string;
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
					{props.description}
				</p>
				<p className="text-xs font-medium text-zinc-800">
					{props.price} - {props.duration}
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
