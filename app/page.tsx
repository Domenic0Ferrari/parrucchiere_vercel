"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<div className="h-screen bg-black font-sans text-white">
			<div className="relative h-full w-full overflow-hidden">
				<Image
					src="/capelli_home.jpg"
					alt="capelli_home"
					fill
					priority
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />

				<header className="absolute inset-x-0 top-0 z-20">
					<nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-sm text-black bg-white">
						<div className="font-semibold">Salone Online</div>
						<div className="hidden items-center gap-6 md:flex">
							<Link href="/" className="hover:text-white/90 text-white">
								Home
							</Link>
							<Link href="/servizi" className="hover:text-white/90 text-white">
								Servizi
							</Link>
							<a href="#chi-siamo" className="hover:text-white/90 text-white">
								Chi siamo
							</a>
							<a href="#contattaci" className="hover:text-white/90 text-white">
								Contattaci
							</a>
						</div>
						<button
							type="button"
							className="inline-flex items-center justify-center rounded-md border border-white/20 bg-black/30 p-2 text-zinc-100 shadow-sm backdrop-blur hover:bg-black/50 md:hidden"
							aria-label="Apri il menu"
							onClick={() => setMenuOpen((open) => !open)}
						>
							<span className="sr-only">Apri il menu</span>
							<div className="space-y-1.5">
								<span className="block h-0.5 w-5 bg-zinc-100" />
								<span className="block h-0.5 w-5 bg-zinc-100" />
								<span className="block h-0.5 w-5 bg-zinc-100" />
							</div>
						</button>
					</nav>
					{menuOpen && (
						<div className="mx-auto max-w-5xl px-4 pb-4 md:hidden">
							<div className="space-y-1 rounded-xl bg-black/70 p-3 text-sm text-zinc-100 shadow-lg backdrop-blur">
								<Link
									href="/"
									className="block rounded-lg px-2 py-1.5 hover:bg-white/10"
									onClick={() => setMenuOpen(false)}
								>
									Home
								</Link>
								<Link
									href="/servizi"
									className="block rounded-lg px-2 py-1.5 hover:bg-white/10"
									onClick={() => setMenuOpen(false)}
								>
									Servizi
								</Link>
								<a
									href="#chi-siamo"
									className="block rounded-lg px-2 py-1.5 hover:bg-white/10"
									onClick={() => setMenuOpen(false)}
								>
									Chi siamo
								</a>
								<a
									href="#contattaci"
									className="block rounded-lg px-2 py-1.5 hover:bg-white/10"
									onClick={() => setMenuOpen(false)}
								>
									Contattaci
								</a>
							</div>
						</div>
					)}
				</header>

				<main
					id="home"
					className="relative z-10 flex h-full items-center px-6 sm:px-10"
				>
					<section className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-4">
						<p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">
							CHI SONO
						</p>
						<h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
							Curo i tuoi capelli con attenzione artigianale e stile su misura.
						</h1>
						<p className="max-w-lg text-sm leading-relaxed text-zinc-200 sm:text-base">
							Sono un parrucchiere specializzato in tagli e colorazioni
							personalizzate. Ascolto le tue esigenze, studio il tuo viso e ti
							consiglio il look pi&ugrave; adatto, utilizzando solo prodotti
							selezionati e tecniche aggiornate.
						</p>
						<div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
							<a
								href="/servizi"
								className="inline-flex w-fit items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/40"
							>
								Prenota un servizio
							</a>
							<a
								href="#contattaci"
								className="inline-flex w-fit items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
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
