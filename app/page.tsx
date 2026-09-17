"use client";
import Image from "next/image";

export default function Home() {
	return (
		<div className="bg-zinc-50 font-sans">
			<main
				id="home"
				className="mx-auto grid min-h-[calc(100dvh-var(--navbar-height))] max-w-[1440px] overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
			>
				<section className="flex min-h-[22rem] flex-col justify-center bg-zinc-950 px-6 py-12 text-white sm:px-10 sm:py-16 lg:min-h-0 lg:px-12 xl:px-16">
					<div className="max-w-xl">
						<h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
							Curo i tuoi capelli con attenzione artigianale e stile su misura.
						</h1>
						<p className="mt-5 max-w-lg text-sm leading-relaxed text-zinc-200 sm:text-base">
							Ascolto le tue esigenze, studio il tuo viso e ti consiglio il look più adatto, con prodotti selezionati e tecniche aggiornate.
						</p>
						<div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
							<a
								href="/service"
								className="inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-white/40 sm:w-48"
							>
								Prenota
							</a>
							<a
								href="/contacts"
								className="inline-flex w-full items-center justify-center rounded-full border border-white/35 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-48"
							>
								Contattaci
							</a>
						</div>
					</div>
				</section>

				<div className="relative h-[44dvh] min-h-72 sm:h-[26rem] lg:h-auto lg:min-h-0">
				<Image
					src="/home-hero.avif"
					alt="Immagine del salone"
					fill
					priority
					quality={100}
					sizes="100vw"
					className="object-cover"
				/>
				</div>
			</main>
		</div>
	);
}
