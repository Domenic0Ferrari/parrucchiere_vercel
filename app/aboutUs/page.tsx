"use client";

import Image from "next/image";

export default function ChiSiamoPage() {
	return (
		<div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
			<div className="relative h-[280px] w-full overflow-hidden sm:h-[360px] lg:h-[420px]">
				<Image
					src="/capelli_home.jpg"
					alt="Interno salone"
					fill
					priority
					sizes="100vw"
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/25" />

				<div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col justify-end px-4 pb-10 sm:px-6">
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">
						CHI SIAMO
					</p>
					<h1 className="mt-2 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
						Passione, tecnica e ascolto per valorizzare ogni persona.
					</h1>
				</div>
			</div>

			<main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
				<section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
					<h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
						La nostra storia
					</h2>
					<p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
						Siamo un salone nato per offrire un servizio curato nei dettagli, dove
						consulenza, stile e benessere vanno insieme. Ogni appuntamento parte
						dall&apos;ascolto: analizziamo forma del viso, tipo di capello e routine
						quotidiana per creare un risultato armonioso e facile da gestire.
					</p>
					<p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
						Lavoriamo con prodotti selezionati e tecniche aggiornate per taglio,
						colore e trattamenti. Il nostro obiettivo e darti un look che ti
						rappresenti davvero, mantenendo qualita e cura ad ogni visita.
					</p>
				</section>

				<section className="mt-8">
					<h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
						Il salone in immagini
					</h2>
					<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<figure className="relative h-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
							<Image
								src="/capelli_home.jpg"
								alt="Area styling"
								fill
								sizes="(max-width: 1024px) 50vw, 33vw"
								className="object-cover"
							/>
						</figure>
						<figure className="relative h-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
							<Image
								src="/capelli_servizi.jpg"
								alt="Postazione lavaggio"
								fill
								sizes="(max-width: 1024px) 50vw, 33vw"
								className="object-cover"
							/>
						</figure>
						<figure className="relative h-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:col-span-2 lg:col-span-1">
							<Image
								src="/capelli_home.jpg"
								alt="Dettaglio prodotti professionali"
								fill
								sizes="(max-width: 1024px) 100vw, 33vw"
								className="object-cover"
							/>
						</figure>
					</div>
				</section>

				<section id="contattaci" className="mt-8 scroll-mt-24">
					<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
						<h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
							Contattaci
						</h2>
						<p className="mt-1 text-sm text-zinc-600">
							Per info su disponibilita, prezzi e promozioni, scrivici o chiamaci.
						</p>
						<div className="mt-5 grid gap-4 sm:grid-cols-3">
							<div className="rounded-xl bg-zinc-50 p-4">
								<div className="text-xs font-medium text-zinc-500">Telefono</div>
								<div className="mt-1 text-sm font-semibold text-zinc-900">
									+39 000 000 0000
								</div>
							</div>
							<div className="rounded-xl bg-zinc-50 p-4">
								<div className="text-xs font-medium text-zinc-500">Email</div>
								<div className="mt-1 text-sm font-semibold text-zinc-900">
									info@saleone.it
								</div>
							</div>
							<div className="rounded-xl bg-zinc-50 p-4">
								<div className="text-xs font-medium text-zinc-500">Indirizzo</div>
								<div className="mt-1 text-sm font-semibold text-zinc-900">
									Via Esempio 1, Citta
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}