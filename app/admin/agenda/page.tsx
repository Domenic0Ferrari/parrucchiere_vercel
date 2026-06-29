"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { createDayView, createMonthView, createWeekView, DayFlowCalendar, useCalendarApp, ViewType } from "@dayflow/react";
import "@dayflow/core/dist/styles.components.css";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployeeSession } from "@/components/auth/employee-session-provider";

type AppointmentRow = {
	id: string;
	customer_name: string;
	service_name: string;
	operator_name: string | null;
	start_at: string;
	end_at: string;
	notes: string | null;
};

const TIME_ZONE = "Europe/Rome";
const AGENDA_START_HOUR = 8;
const AGENDA_END_HOUR = 20;
const CALENDAR_FIRST_HOUR = 0;
const CALENDAR_LAST_HOUR = 24;
const CALENDAR_HOUR_HEIGHT = 64;
const CALENDAR_HOURS_COUNT = CALENDAR_LAST_HOUR - CALENDAR_FIRST_HOUR;

function toZonedDateTime(value: string) {
	if (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value)) {
		return Temporal.Instant.from(value).toZonedDateTimeISO(TIME_ZONE);
	}

	return Temporal.PlainDateTime.from(value.replace(" ", "T")).toZonedDateTime(TIME_ZONE);
}

function toInputDateTime(value: string) {
	const zdt = toZonedDateTime(value);
	return `${zdt.toPlainDate().toString()}T${zdt.toPlainTime().toString({ smallestUnit: "minute" })}`;
}

function toHourMinute(value: string) {
	return toZonedDateTime(value).toPlainTime().toString({ smallestUnit: "minute" });
}

function isWithinAgendaHours(start: Temporal.PlainDateTime, end: Temporal.PlainDateTime) {
	const agendaStart = Temporal.PlainTime.from({ hour: AGENDA_START_HOUR });
	const agendaEnd = Temporal.PlainTime.from({ hour: AGENDA_END_HOUR });
	return Temporal.PlainTime.compare(start.toPlainTime(), agendaStart) >= 0
		&& Temporal.PlainTime.compare(end.toPlainTime(), agendaEnd) <= 0;
}

const initialAppointments: AppointmentRow[] = [
	{
		id: "1",
		customer_name: "Marco Rossi",
		service_name: "Taglio",
		operator_name: "Luca",
		start_at: "2026-05-11T10:00",
		end_at: "2026-05-11T10:45",
		notes: "Cliente abituale",
	},
	{
		id: "2",
		customer_name: "Giulia Bianchi",
		service_name: "Colore",
		operator_name: "Giulia",
		start_at: "2026-05-11T11:00",
		end_at: "2026-05-11T12:00",
		notes: null,
	},
];

export default function AdminAgendaPage() {
	const [appointments, setAppointments] = useState<AppointmentRow[]>(initialAppointments);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const { employee } = useEmployeeSession();
	const loggedOperatorName = employee?.name ?? "";

	const [customerName, setCustomerName] = useState("");
	const [serviceName, setServiceName] = useState("");
	const [startAt, setStartAt] = useState("");
	const [endAt, setEndAt] = useState("");
	const [notes, setNotes] = useState("");
	const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
	const [editCustomerName, setEditCustomerName] = useState("");
	const [editServiceName, setEditServiceName] = useState("");
	const [editStartAt, setEditStartAt] = useState("");
	const [editEndAt, setEditEndAt] = useState("");
	const [editNotes, setEditNotes] = useState("");
	const [calendarView, setCalendarView] = useState<string>(ViewType.WEEK);

	const calendarEvents = useMemo(
		() =>
			appointments.map((item) => {
				const baseText = `${item.customer_name}\n${toHourMinute(item.start_at)}-${toHourMinute(item.end_at)} | ${item.service_name}`;
				return {
					id: item.id,
					title: baseText,
					start: toZonedDateTime(item.start_at),
					end: toZonedDateTime(item.end_at),
					description: item.notes ?? "",
				};
			}),
		[appointments]
	);

	const [calendarDate, setCalendarDate] = useState(() => Temporal.Now.plainDateISO().toString());
	const selectedAppointment = useMemo(
		() => appointments.find((item) => item.id === selectedAppointmentId) ?? null,
		[appointments, selectedAppointmentId]
	);

	const calendar = useCalendarApp({
		locale: "it-IT",
		timeZone: TIME_ZONE,
		views: [
			createDayView({
				firstHour: CALENDAR_FIRST_HOUR,
				lastHour: CALENDAR_LAST_HOUR,
				showAllDay: false,
				hourHeight: CALENDAR_HOUR_HEIGHT,
				scrollToCurrentTime: false,
			}),
			createWeekView({
				firstHour: CALENDAR_FIRST_HOUR,
				lastHour: CALENDAR_LAST_HOUR,
				startOfWeek: 1,
				showAllDay: false,
				hourHeight: CALENDAR_HOUR_HEIGHT,
				scrollToCurrentTime: false,
			}),
			createMonthView(),
		],
		defaultView: ViewType.WEEK,
		initialDate: new Date(`${calendarDate}T00:00:00`),
		events: calendarEvents,
		useCalendarHeader: false,
		callbacks: {
			onDateChange: (date) => {
				const next = Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(TIME_ZONE).toPlainDate().toString();
				setCalendarDate(next);
			},
			onViewChange: (view) => {
				setCalendarView(view);
			},
			onEventClick: (event) => {
				const eventId = String(event.id);
				const current = appointments.find((item) => item.id === eventId);
				if (!current) return;
				setSelectedAppointmentId(eventId);
				setEditCustomerName(current.customer_name);
				setEditServiceName(current.service_name);
				setEditStartAt(toInputDateTime(current.start_at));
				setEditEndAt(toInputDateTime(current.end_at));
				setEditNotes(current.notes ?? "");
			},
		},
	});

	useEffect(() => {
		if (calendarView !== ViewType.DAY && calendarView !== ViewType.WEEK) return;

		const scrollToAgendaStart = () => {
			const content = document.querySelector<HTMLElement>(
				".df-calendar-container .df-calendar-content, .df-calendar-container .df-week-time-grid-scroller"
			);
			if (!content) return false;
			content.scrollTop = (AGENDA_START_HOUR - CALENDAR_FIRST_HOUR) * CALENDAR_HOUR_HEIGHT;
			return true;
		};

		if (scrollToAgendaStart()) return;
		const timer = window.setTimeout(scrollToAgendaStart, 100);
		return () => window.clearTimeout(timer);
	}, [calendarView, calendarDate]);

	const changeCalendarView = (nextView: string) => {
		const mappedView = nextView as ViewType;
		setCalendarView(mappedView);
		calendar.changeView(mappedView);
	};

	const changeCalendarDate = (nextDate: string) => {
		setCalendarDate(nextDate);
		calendar.selectDate(new Date(`${nextDate}T00:00:00`));
	};

	const moveCalendarDate = (direction: -1 | 1) => {
		if (direction === -1) {
			calendar.goToPrevious();
			return;
		}
		calendar.goToNext();
	};

	const onCreateAppointment = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError(null);

		try {
			const start = Temporal.PlainDateTime.from(startAt);
			const end = Temporal.PlainDateTime.from(endAt);
			if (Temporal.PlainDateTime.compare(end, start) <= 0) {
				setError("L'orario di fine deve essere successivo all'orario di inizio.");
				setSaving(false);
				return;
			}
			if (!isWithinAgendaHours(start, end)) {
				setError(`Gli appuntamenti devono essere compresi tra le ${String(AGENDA_START_HOUR).padStart(2, "0")}:00 e le ${String(AGENDA_END_HOUR).padStart(2, "0")}:00.`);
				setSaving(false);
				return;
			}

			setAppointments((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					customer_name: customerName.trim(),
					service_name: serviceName.trim(),
					operator_name: loggedOperatorName || null,
					start_at: start.toString(),
					end_at: end.toString(),
					notes: notes.trim() || null,
				},
			]);

			setCustomerName("");
			setServiceName("");
			setStartAt("");
			setEndAt("");
			setNotes("");
		} finally {
			setSaving(false);
		}
	};

	const onDeleteAppointment = async (id: string) => {
		setAppointments((prev) => prev.filter((item) => item.id !== id));
	};

	const onSaveNotes = async (id: string, newNotes: string) => {
		setAppointments((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, notes: newNotes.trim() || null } : item
			)
		);
	};

	const onSaveAppointmentFromModal = () => {
		if (!selectedAppointmentId) return;
		setError(null);
		const start = Temporal.PlainDateTime.from(editStartAt);
		const end = Temporal.PlainDateTime.from(editEndAt);
		if (Temporal.PlainDateTime.compare(end, start) <= 0) {
			setError("L'orario di fine deve essere successivo all'orario di inizio.");
			return;
		}
		if (!isWithinAgendaHours(start, end)) {
			setError(`Gli appuntamenti devono essere compresi tra le ${String(AGENDA_START_HOUR).padStart(2, "0")}:00 e le ${String(AGENDA_END_HOUR).padStart(2, "0")}:00.`);
			return;
		}

		setAppointments((prev) =>
			prev.map((item) =>
				item.id === selectedAppointmentId
					? {
							...item,
							customer_name: editCustomerName.trim(),
							service_name: editServiceName.trim(),
							operator_name: loggedOperatorName || null,
							start_at: start.toString(),
							end_at: end.toString(),
							notes: editNotes.trim() || null,
						}
					: item
			)
		);
		setSelectedAppointmentId(null);
	};

	const onDeleteFromModal = () => {
		if (!selectedAppointmentId) return;
		void onDeleteAppointment(selectedAppointmentId);
		setSelectedAppointmentId(null);
	};

	return (
		<section className="-mt-4 space-y-3">
			{error ? <p className="text-sm text-red-600">{error}</p> : null}

			<header className="space-y-0.5">
				<h1 className="text-2xl font-semibold text-zinc-900">Agenda</h1>
			</header>

			<div className="overflow-hidden rounded-md border border-zinc-200 lg:h-[calc(100dvh-8.5rem)]">
				<div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
					<div className="flex items-center gap-2">
						<Button type="button" variant="outline" className="cursor-pointer text-zinc-900 hover:text-zinc-900" onClick={() => moveCalendarDate(-1)}>
							Indietro
						</Button>
						<Button type="button" variant="outline" className="cursor-pointer text-zinc-900 hover:text-zinc-900" onClick={() => moveCalendarDate(1)}>
							Avanti
						</Button>
						<Button
							type="button"
							variant="outline"
							className="cursor-pointer text-zinc-900 hover:text-zinc-900"
							onClick={() => changeCalendarDate(Temporal.Now.plainDateISO().toString())}
						>
							Oggi
						</Button>
					</div>
					<input
						type="date"
						value={calendarDate}
						onChange={(e) => changeCalendarDate(e.target.value)}
						className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
					/>
					<div className="flex w-full flex-wrap items-center justify-start gap-2 lg:ml-auto lg:w-auto">
						<Button
							type="button"
							variant="outline"
							className={`cursor-pointer text-zinc-900 hover:text-zinc-900 ${calendarView === ViewType.DAY ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white" : ""}`}
							onClick={() => changeCalendarView(ViewType.DAY)}
						>
							Giorno
						</Button>
						<Button
							type="button"
							variant="outline"
							className={`cursor-pointer text-zinc-900 hover:text-zinc-900 ${calendarView === ViewType.WEEK ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white" : ""}`}
							onClick={() => changeCalendarView(ViewType.WEEK)}
						>
							Settimana
						</Button>
						<Button
							type="button"
							variant="outline"
							className={`cursor-pointer text-zinc-900 hover:text-zinc-900 ${calendarView === ViewType.MONTH ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white" : ""}`}
							onClick={() => changeCalendarView(ViewType.MONTH)}
						>
							Mese
						</Button>
					</div>
				</div>
				<div className="h-[600px] lg:h-full">
					<DayFlowCalendar calendar={calendar} />
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Aggiungi appuntamento</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onCreateAppointment} className="grid gap-3 md:grid-cols-2">
						<input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Cliente" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
						<input required value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Servizio" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
						<input value={loggedOperatorName} readOnly placeholder="Operatore loggato" className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-700" />
						<input required type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
						<input required type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
						<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
						<div className="md:col-span-2">
							<Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Aggiungi"}</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Elenco appuntamenti</CardTitle>
				</CardHeader>
				<CardContent>
					{appointments.length === 0 ? (
						<p className="text-sm text-zinc-600">Nessun appuntamento presente.</p>
					) : (
						<div className="space-y-3">
							{appointments.map((item) => (
								<AppointmentRowItem
									key={item.id}
									item={item}
									onDelete={onDeleteAppointment}
									onSaveNotes={onSaveNotes}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{selectedAppointment ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
						<div className="mb-4 flex items-start justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold text-zinc-900">Dettaglio prenotazione</h2>
								<p className="text-sm text-zinc-600">Modifica i dati e salva le variazioni.</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Chiudi modale"
								className="cursor-pointer text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950"
								onClick={() => setSelectedAppointmentId(null)}
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							<input value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} placeholder="Cliente" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500" />
							<input value={editServiceName} onChange={(e) => setEditServiceName(e.target.value)} placeholder="Servizio" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500" />
							<input value={loggedOperatorName} readOnly placeholder="Operatore loggato" className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-700" />
							<input type="datetime-local" value={editStartAt} onChange={(e) => setEditStartAt(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900" />
							<input type="datetime-local" value={editEndAt} onChange={(e) => setEditEndAt(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900" />
							<input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Note" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500" />
						</div>

						<div className="mt-5 flex flex-wrap gap-2">
							<Button type="button" onClick={onSaveAppointmentFromModal}>
								Salva modifiche
							</Button>
							<Button type="button" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={onDeleteFromModal}>
								Cancella prenotazione
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<style jsx global>{`
				.df-calendar-wrapper,
				.df-calendar-wrapper .df-calendar-container {
					height: 100%;
					--df-calendar-height: 100%;
				}

				.df-calendar-container .df-calendar-content,
				.df-calendar-container .df-week-time-grid-scroller {
					overflow-y: auto !important;
				}

				.df-calendar-container .df-day-content-grid-rows,
				.df-calendar-container .df-week-time-grid-grid-inner,
				.df-calendar-container .df-time-column {
					min-height: calc(${CALENDAR_HOURS_COUNT} * var(--df-hour-height, ${CALENDAR_HOUR_HEIGHT}px));
				}

				.df-event {
					white-space: pre-line !important;
				}
			`}</style>
		</section>
	);
}

function AppointmentRowItem({
	item,
	onDelete,
	onSaveNotes,
}: {
	item: AppointmentRow;
	onDelete: (id: string) => Promise<void>;
	onSaveNotes: (id: string, notes: string) => Promise<void>;
}) {
	const [noteDraft, setNoteDraft] = useState(item.notes ?? "");

	return (
		<div className="rounded-lg border border-zinc-200 p-3">
			<p className="text-sm font-semibold text-zinc-900">{item.service_name} - {item.customer_name}</p>
			<p className="mt-1 text-xs text-zinc-600">
				{toInputDateTime(item.start_at).replace("T", " ")} - {toInputDateTime(item.end_at).replace("T", " ")}
				{item.operator_name ? ` - ${item.operator_name}` : ""}
			</p>
			<div className="mt-2 flex flex-col gap-2 md:flex-row">
				<input
					value={noteDraft}
					onChange={(e) => setNoteDraft(e.target.value)}
					placeholder="Aggiungi note"
					className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
				/>
				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={() => void onSaveNotes(item.id, noteDraft)}>
						Salva note
					</Button>
					<Button
						type="button"
						variant="outline"
						className="border-red-300 text-red-700 hover:bg-red-50"
						onClick={() => void onDelete(item.id)}
					>
						Cancella
					</Button>
				</div>
			</div>
		</div>
	);
}
