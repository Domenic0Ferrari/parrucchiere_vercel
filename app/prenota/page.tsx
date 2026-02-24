"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 6;
}

function createAvailability(operatorId: string, dayIndex: number): string[] {
	if (dayIndex % 7 === 6) return [];

	return baseSlots.filter((_, slotIndex) => {
		const seed = operatorId.charCodeAt(0) + dayIndex + slotIndex;
		return seed % 3 !== 0;
	});
}

export default function PrenotaPage() {
	const [menuOpen, setMenuOpen] = useState(false);
	const [selectedOperator, setSelectedOperator] = useState(operators[0]?.id ?? "");
	const [selectedDayIndex, setSelectedDayIndex] = useState(0);
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
	const [weekStartIndex, setWeekStartIndex] = useState(0);
	const [weekAnimationKey, setWeekAnimationKey] = useState(0);

	const days = useMemo(() => getNextDays(28), []);
	const maxWeekStart = Math.max(0, days.length - 7);
	const visibleDays = days.slice(weekStartIndex, weekStartIndex + 7);
	const headerDate = visibleDays[0] ?? days[0];

	const availableSlots = useMemo(
		() => createAvailability(selectedOperator, selectedDayIndex),
		[selectedOperator, selectedDayIndex],
	);

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

				<header className="absolute inset-x-0 top-0 z-20">
					<nav className="mx-auto flex max-w-5xl items-center justify-between bg-white px-4 py-4 text-sm text-black">
						<div className="font-semibold">Salone Online</div>
						<div className="hidden items-center gap-6 md:flex">
							<Link href="/" className="text-zinc-700 hover:text-zinc-900">
								Home
							</Link>
							<Link href="/servizi" className="text-zinc-700 hover:text-zinc-900">
								Servizi
							</Link>
							<Link href="/prenota" className="font-semibold text-zinc-900">
								Prenota
							</Link>
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
								<Link
									href="/prenota"
									className="block rounded-lg px-2 py-1.5 hover:bg-white/10"
									onClick={() => setMenuOpen(false)}
								>
									Prenota
								</Link>
							</div>
						</div>
					)}
				</header>

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
										const muted = isWeekend(day) && !selected;

										return (
											<button
												key={day.toISOString()}
												type="button"
												onClick={() => {
													setSelectedDayIndex(index);
													setSelectedSlot(null);
												}}
												className="flex flex-col items-center rounded-xl px-1 py-1.5 text-center transition hover:bg-zinc-200/60"
											>
												<span
													className={`text-xs font-semibold capitalize sm:text-sm ${
														muted ? "text-zinc-500" : "text-zinc-700"
													}`}
												>
													{formatWeekday(day)}
												</span>
												<span
													className={`mt-2 flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold sm:h-11 sm:w-11 sm:text-xl ${
														selected
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
											className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
												selectedSlot === slot
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
								className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
							>
								Continua
							</button>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
