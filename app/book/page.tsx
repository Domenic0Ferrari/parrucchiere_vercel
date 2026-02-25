"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Operator = {
	id: string;
	name: string;
};

const operators: Operator[] = [
	{ id: "luca", name: "Luca" },
	{ id: "giulia", name: "Giulia" },
	{ id: "marco", name: "Marco" },
];

const baseSlots = [
	"09:00",
	"09:30",
	"10:00",
	"10:30",
	"11:00",
	"11:30",
	"14:00",
	"14:30",
	"15:00",
	"15:30",
	"16:00",
	"16:30",
	"17:00",
	"17:30",
];

function getNextDays(count: number): Date[] {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	return Array.from({ length: count }, (_, index) => {
		const day = new Date(today);
		day.setDate(today.getDate() + index);
		return day;
	});
}

function formatWeekday(date: Date): string {
	return new Intl.DateTimeFormat("it-IT", { weekday: "short" })
		.format(date)
		.replace(".", "");
}

function formatDayNumber(date: Date): string {
	return new Intl.DateTimeFormat("it-IT", { day: "2-digit" }).format(date);
}

function formatMonthLabel(date: Date): string {
	return new Intl.DateTimeFormat("it-IT", {
		month: "long",
		year: "numeric",
	}).format(date);
}

function formatFullDate(date: Date): string {
	return new Intl.DateTimeFormat("it-IT", {
		weekday: "long",
		day: "2-digit",
		month: "long",
		year: "numeric",
	}).format(date);
}

function isClosedDay(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 1;
}

function createAvailability(operatorId: string, day: Date): string[] {
	const weekday = day.getDay();
	if (weekday === 0 || weekday === 1) return [];

	return baseSlots.filter((_, slotIndex) => {
		const daySeed = day.getFullYear() * 10000 + (day.getMonth() + 1) * 100 + day.getDate();
		const seed = operatorId.charCodeAt(0) + daySeed + slotIndex;
		return seed % 3 !== 0;
	});
}

export default function BookPage() {
	const searchParams = useSearchParams();
	const selectedService = searchParams.get("servizio");
	const [selectedOperator, setSelectedOperator] = useState(operators[0]?.id ?? "");
	const [selectedDayIndex, setSelectedDayIndex] = useState(0);
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
	const [weekStartIndex, setWeekStartIndex] = useState(0);
	const [weekAnimationKey, setWeekAnimationKey] = useState(0);
	const [showDetailsForm, setShowDetailsForm] = useState(false);
	const detailsFormRef = useRef<HTMLFormElement | null>(null);
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");

	const days = useMemo(() => getNextDays(28), []);
	const maxWeekStart = Math.max(0, days.length - 7);
	const visibleDays = days.slice(weekStartIndex, weekStartIndex + 7);
	const headerDate = visibleDays[0] ?? days[0];

	const availableSlots = useMemo(
		() => createAvailability(selectedOperator, days[selectedDayIndex] ?? days[0]),
		[selectedOperator, selectedDayIndex, days],
	);
	const selectedDate = days[selectedDayIndex] ?? days[0];
	const isRequestFormValid =
		fullName.trim().length > 0 &&
		email.trim().length > 0 &&
		phone.trim().length > 0;
	const isAccessAllowed = useMemo(() => {
		if (!selectedService || typeof window === "undefined") return false;

		const tokenRaw = window.sessionStorage.getItem("booking_access_token");
		if (!tokenRaw) return false;

		try {
			const token = JSON.parse(tokenRaw) as { service?: string };
			const isMatchingService = token.service === selectedService;
			return isMatchingService;
		} catch {
			return false;
		}
	}, [selectedService]);

	useEffect(() => {
		if (!showDetailsForm) return;
		detailsFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [showDetailsForm]);

	if (!isAccessAllowed) {
		return (
			<div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
				<main className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6">
					<div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
						<h1 className="text-xl font-semibold text-zinc-900">
							Accesso non consentito
						</h1>
						<p className="mt-2 text-sm text-zinc-600">
							Per aprire la pagina prenotazione devi prima selezionare un servizio e premere &quot;Prenota&quot; dalla pagina servizi.
						</p>
						<div className="mt-4 flex flex-wrap gap-3">
							<Link
								href="/service"
								className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
							>
								Vai ai servizi
							</Link>
						</div>
					</div>
				</main>
			</div>
		);
	}

	const handleWeekShift = (direction: -1 | 1) => {
		const offsetInWeek = Math.min(6, Math.max(0, selectedDayIndex - weekStartIndex));
		const nextStart = Math.min(
			maxWeekStart,
			Math.max(0, weekStartIndex + direction * 7),
		);
		const nextSelected = Math.min(days.length - 1, nextStart + offsetInWeek);

		setWeekStartIndex(nextStart);
		setSelectedDayIndex(nextSelected);
		setSelectedSlot(null);
		setShowDetailsForm(false);
		setWeekAnimationKey((current) => current + 1);
	};

	return (
		<div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
			<div className="relative h-[300px] w-full overflow-hidden bg-black text-white sm:h-[360px]">
				<Image
					src="/capelli_home.jpg"
					alt="capelli_home"
					fill
					priority
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />

				<div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-10 pt-24 sm:px-6">
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">
						PRENOTA ORA
					</p>
					<h1 className="mt-2 max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight text-zinc-300 sm:text-4xl">
						Seleziona operatore, giorno e orario
					</h1>
				</div>
			</div>

			<main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
				<section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
					<div className="grid gap-6">
						<div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
							<p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
								Servizio selezionato
							</p>
							<p className="mt-1 text-sm font-semibold text-zinc-900">
								{selectedService ?? "Nessun servizio selezionato"}
							</p>
						</div>

						<div>
							<label
								htmlFor="operator"
								className="mb-2 block text-sm font-semibold text-zinc-900"
							>
								Operatore
							</label>
							<Select
								value={selectedOperator}
								onValueChange={(value) => {
									setSelectedOperator(value);
									setSelectedDayIndex(weekStartIndex);
									setSelectedSlot(null);
									setShowDetailsForm(false);
								}}
							>
								<SelectTrigger id="operator">
									<SelectValue
										placeholder="Seleziona operatore"
										className="text-zinc-900"
									/>
								</SelectTrigger>
								<SelectContent>
									{operators.map((operator) => (
										<SelectItem key={operator.id} value={operator.id}>
											{operator.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<p className="mb-2 text-sm font-semibold text-zinc-900">Giorni disponibili</p>
							<div className="rounded-2xl border border-zinc-200 bg-zinc-100 px-3 py-4 sm:px-4">
								<div className="mb-3 flex items-center justify-between">
									<p className="text-2xl font-semibold capitalize text-zinc-800 sm:text-[2rem]">
										{formatMonthLabel(headerDate)}
									</p>
									<div className="flex items-center gap-2">
										<button
											type="button"
											aria-label="Settimana precedente"
											disabled={weekStartIndex === 0}
											onClick={() => handleWeekShift(-1)}
											className="rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-600 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												className="h-4 w-4"
											>
												<path d="M15 18l-6-6 6-6" />
											</svg>
										</button>
										<button
											type="button"
											aria-label="Settimana successiva"
											disabled={weekStartIndex >= maxWeekStart}
											onClick={() => handleWeekShift(1)}
											className="rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-600 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												className="h-4 w-4"
											>
												<path d="M9 18l6-6-6-6" />
											</svg>
										</button>
									</div>
								</div>
								<div key={weekAnimationKey} className="calendar-enter grid grid-cols-7 gap-1">
									{visibleDays.map((day, visibleIndex) => {
										const index = weekStartIndex + visibleIndex;
										const selected = selectedDayIndex === index;
										const muted = isClosedDay(day) && !selected;

										return (
											<button
												key={day.toISOString()}
												type="button"
												onClick={() => {
													setSelectedDayIndex(index);
													setSelectedSlot(null);
													setShowDetailsForm(false);
												}}
												className="flex flex-col items-center rounded-xl px-1 py-1.5 text-center transition hover:bg-zinc-200/60"
											>
												<span
													className={`text-xs font-semibold capitalize sm:text-sm ${muted ? "text-zinc-500" : "text-zinc-700"
														}`}
												>
													{formatWeekday(day)}
												</span>
												<span
													className={`mt-2 flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold sm:h-11 sm:w-11 sm:text-xl ${selected
															? "day-selected-pop border-zinc-900 bg-zinc-900 text-white shadow-sm"
															: muted
																? "border-zinc-300 bg-transparent text-zinc-500"
																: "border-zinc-300 bg-white text-zinc-800"
														}`}
												>
													{formatDayNumber(day)}
												</span>
											</button>
										);
									})}
								</div>
							</div>
						</div>

						<div>
							<p className="mb-2 text-sm font-semibold text-zinc-900">Orari disponibili</p>
							{availableSlots.length === 0 ? (
								<div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
									Nessuna disponibilita in questo giorno. Seleziona un altro giorno.
								</div>
							) : (
								<div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
									{availableSlots.map((slot) => (
										<button
											key={slot}
											type="button"
											onClick={() => setSelectedSlot(slot)}
											className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${selectedSlot === slot
													? "border-zinc-900 bg-zinc-900 text-white"
													: "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
												}`}
										>
											{slot}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="pt-2">
							<button
								type="button"
								disabled={!selectedSlot}
								onClick={() => setShowDetailsForm(true)}
								className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
							>
								Continua
							</button>
						</div>

						{showDetailsForm && selectedSlot && (
							<form
								ref={detailsFormRef}
								className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5"
								onSubmit={(event) => event.preventDefault()}
							>
								<h2 className="text-base font-semibold text-zinc-900 sm:text-lg">
									I tuoi dati
								</h2>
								<p className="mt-1 text-sm text-zinc-600">
									Compila i campi per completare la richiesta di prenotazione.
								</p>

								<div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
									<div>
										<span className="font-semibold text-zinc-900">Servizio:</span>{" "}
										{selectedService ?? "Non specificato"}
									</div>
									<div>
										<span className="font-semibold text-zinc-900">Operatore:</span>{" "}
										{operators.find((operator) => operator.id === selectedOperator)?.name}
									</div>
									<div>
										<span className="font-semibold text-zinc-900">Data:</span>{" "}
										{formatFullDate(selectedDate)}
									</div>
									<div>
										<span className="font-semibold text-zinc-900">Orario:</span>{" "}
										{selectedSlot}
									</div>
								</div>

								<div className="mt-4 grid gap-4">
									<div>
										<label
											htmlFor="fullName"
											className="mb-1.5 block text-sm font-semibold text-zinc-900"
										>
											Nome completo
										</label>
										<input
											id="fullName"
											type="text"
											required
											value={fullName}
											onChange={(event) => setFullName(event.target.value)}
											placeholder="Mario Rossi"
											className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
										/>
									</div>

									<div>
										<label
											htmlFor="email"
											className="mb-1.5 block text-sm font-semibold text-zinc-900"
										>
											Email
										</label>
										<input
											id="email"
											type="email"
											required
											value={email}
											onChange={(event) => setEmail(event.target.value)}
											placeholder="nome@email.it"
											className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
										/>
									</div>

									<div>
										<label
											htmlFor="phone"
											className="mb-1.5 block text-sm font-semibold text-zinc-900"
										>
											Numero di telefono
										</label>
										<input
											id="phone"
											type="tel"
											required
											value={phone}
											onChange={(event) => setPhone(event.target.value)}
											placeholder="+39 333 123 4567"
											className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={!isRequestFormValid}
									className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
								>
									Invia richiesta
								</button>
							</form>
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
