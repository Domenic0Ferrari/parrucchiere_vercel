import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";

const phone = "+39 000 000 0000";
const email = "info@salone.it";
const address = "Via Esempio 1, Città";
const mapsUrl = "https://www.google.com/maps/search/?api=1&query=Via%20Esempio%201%2C%20Citt%C3%A0";

export default function ContactsPage() {
	return (
		<div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 text-zinc-900">
			<main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
				<header className="max-w-2xl">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Contatti</p>
					<h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
						Parliamo del tuo prossimo look
					</h1>
					<p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
						Per informazioni, disponibilità o per fissare un appuntamento, scegli il canale che preferisci.
					</p>
				</header>

				<section className="mt-7 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Informazioni di contatto">
					<div className="grid gap-4 sm:grid-cols-3">
						<a href="tel:+390000000000" className="group rounded-xl bg-zinc-50 p-4 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/35">
							<Phone aria-hidden="true" className="size-5 text-brand" />
							<p className="mt-4 text-xs font-medium text-zinc-500">Telefono</p>
							<p className="mt-1 text-sm font-semibold text-zinc-900 group-hover:text-brand">{phone}</p>
							{/* <p className="mt-2 text-xs text-zinc-600">Tocca per chiamare</p> */}
						</a>

						<a href={`mailto:${email}`} className="group rounded-xl bg-zinc-50 p-4 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/35">
							<Mail aria-hidden="true" className="size-5 text-brand" />
							<p className="mt-4 text-xs font-medium text-zinc-500">Email</p>
							<p className="mt-1 break-all text-sm font-semibold text-zinc-900 group-hover:text-brand">{email}</p>
							{/* <p className="mt-2 text-xs text-zinc-600">Scrivici un messaggio</p> */}
						</a>

						<a href={mapsUrl} target="_blank" rel="noreferrer" className="group rounded-xl bg-zinc-50 p-4 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/35">
							<div className="flex items-center justify-between gap-3">
								<MapPin aria-hidden="true" className="size-5 text-brand" />
								<ExternalLink aria-hidden="true" className="size-4 text-zinc-500 group-hover:text-brand" />
							</div>
							<p className="mt-4 text-xs font-medium text-zinc-500">Indirizzo</p>
							<p className="mt-1 text-sm font-semibold text-zinc-900 group-hover:text-brand">{address}</p>
							{/* <p className="mt-2 text-xs text-zinc-600">Apri indicazioni in Google Maps</p> */}
						</a>
					</div>
				</section>
			</main>
		</div>
	);
}
