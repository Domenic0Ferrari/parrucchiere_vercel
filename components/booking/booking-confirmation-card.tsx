import Link from "next/link";
import { CalendarDays, Check, Clock3, Scissors, UserRound } from "lucide-react";

export type BookingConfirmation = {
	serviceName: string;
	employeeName: string;
	startTime: string;
	endTime: string;
	durationMinutes: number | null;
	price: number | string | null;
	customerName: string;
	phone: string;
	email: string;
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function durationLabel(minutes: number | null) {
	if (!minutes || minutes <= 0) return "Da definire";
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	if (!hours) return `${remainingMinutes} min`;
	return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function priceLabel(price: number | string | null) {
	if (price === null || price === "") return "Da definire in salone";
	const value = Number(price);
	return Number.isFinite(value) ? priceFormatter.format(value) : "Da definire in salone";
}

export function BookingConfirmationCard({ booking }: { booking: BookingConfirmation }) {
	const start = new Date(booking.startTime);
	const end = new Date(booking.endTime);

	return <div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 text-zinc-900">
		<main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
			<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
				<div className="border-b border-zinc-200 px-5 py-6 sm:px-8 sm:py-8">
					<div className="mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-6" strokeWidth={2.5} aria-hidden="true" /></div>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Prenotazione confermata</h1>
					<p className="mt-2 text-sm leading-6 text-zinc-600 sm:text-base">Abbiamo registrato il tuo appuntamento. Ti aspettiamo in salone!</p>
				</div>
				<div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
					<section aria-label="Dettagli dell’appuntamento" className="space-y-5">
						<div className="flex gap-3"><Scissors className="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Servizio</p><p className="mt-1 font-semibold text-zinc-900">{booking.serviceName}</p></div></div>
						<div className="flex gap-3"><UserRound className="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Addetto</p><p className="mt-1 font-semibold text-zinc-900">{booking.employeeName}</p></div></div>
						<div className="flex gap-3"><CalendarDays className="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Giorno</p><p className="mt-1 font-semibold capitalize text-zinc-900">{dateFormatter.format(start)}</p></div></div>
						<div className="flex gap-3"><Clock3 className="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Orario</p><p className="mt-1 font-semibold text-zinc-900">{timeFormatter.format(start)} – {timeFormatter.format(end)}</p></div></div>
					</section>
					<div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-4 sm:gap-6"><div><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Durata</p><p className="mt-1 text-base font-semibold">{durationLabel(booking.durationMinutes)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Prezzo</p><p className="mt-1 text-base font-semibold">{priceLabel(booking.price)}</p></div></div>
					<section aria-label="Contatti della prenotazione" className="border-t border-zinc-200 pt-5"><h2 className="text-sm font-semibold">Prenotazione per {booking.customerName}</h2><div className="mt-2 space-y-1 text-sm text-zinc-600">{booking.phone && <p>Telefono: {booking.phone}</p>}{booking.email && <p className="break-all">Email: {booking.email}</p>}</div></section>
					<Link href="/" className="flex min-h-12 items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">Torna alla home</Link>
				</div>
			</div>
		</main>
	</div>;
}
