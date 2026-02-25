"use client";
import Image from "next/image";

export default function Home() {
	return (
		<div className="home-viewport bg-black font-sans text-white">
			<div className="relative h-full w-full overflow-hidden">
				<Image
					src="/capelli_home.jpg"
					alt="capelli_home"
					fill
					priority
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />

				<main
					id="home"
					className="relative z-10 flex h-full items-center px-4 sm:px-8"
				>
					<section className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-3 sm:gap-4">
						<p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-300">
							CHI SONO
						</p>
						<h1 className="max-w-xl text-balance text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
							Curo i tuoi capelli con attenzione artigianale e stile su misura.
						</h1>
						<p className="max-w-lg text-sm leading-relaxed text-zinc-200 sm:text-base">
							Sono un parrucchiere specializzato in tagli e colorazioni
							personalizzate. Ascolto le tue esigenze, studio il tuo viso e ti
							consiglio il look pi&ugrave; adatto, utilizzando solo prodotti
							selezionati e tecniche aggiornate.
						</p>
						<div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
							<a
								href="/service"
								className="inline-flex w-fit items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/40 sm:px-6 sm:py-3"
							>
								Prenota un servizio
							</a>
							<a
								href="/service#contattaci"
								className="inline-flex w-fit items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 sm:px-6 sm:py-3"
							>
								Contattaci
							</a>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}
