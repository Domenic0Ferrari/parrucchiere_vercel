 "use client";
import { useState } from "react";
import Image from "next/image";

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
							<a href="#home" className="hover:text-white/90">
								Home
							</a>
							<a href="#servizi" className="hover:text-white/90">
								Servizi
							</a>
							<a href="#chi-siamo" className="hover:text-white/90">
								Chi siamo
							</a>
							<a href="#contattaci" className="hover:text-white/90">
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
								<a
									href="#home"
									className="block rounded-lg px-2 py-1.5 hover:bg-white/10"
									onClick={() => setMenuOpen(false)}
								>
									Home
								</a>
								<a
									href="#servizi"
									className="block rounded-lg px-2 py-1.5 hover:bg_WHITE/10"
									onClick={() => setMenuOpen(false)}
								>
									Servizi
								</a>
								<a
									href="#chi-siamo"
									className="block rounded-lg px-2 py-1.5 hover:bg_WHITE/10"
									onClick={() => setMenuOpen(false)}
								>
									Chi siamo
								</a>
								<a
									href="#contattaci"
									className="block rounded-lg px-2 py-1.5 hover:bg_WHITE/10"
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
					</section>
				</main>
			</div>
		</div>
	);
}
