"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { it } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarDays, Clock3, Scissors, SlidersHorizontal, X } from "lucide-react";
import { CustomerPortalShell } from "@/components/account/customer-portal-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Appointment = { id: string; serviceId: string; employeeId: string; serviceName: string; employeeName: string; startTime: string; endTime: string; status: string; price: number | string | null; durationMinutes: number | null; canChange: boolean; source: string };
type Catalog = { services: Array<{ id: string; name: string; price: number | string | null; duration: number }>; employees: Array<{ id: string; name: string }> };
type Slot = { time: string; disabled: boolean };
type View = "dashboard" | "history";

const dateFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const localDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const today = () => localDate(new Date().toISOString());
const maxDate = () => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 27); return date.toISOString().slice(0, 10); };
const priceLabel = (price: number | string | null) => price == null ? "Da definire in salone" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(price));
const compactDateFormatter = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" });

function toLocalDate(value: string) { return new Date(`${value}T12:00:00`); }
function toIsoDate(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }

export function CustomerBookings({ view = "dashboard" }: { view?: View }) {
	const router = useRouter();
	const [items, setItems] = useState<Appointment[]>([]);
	const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
	const [catalog, setCatalog] = useState<Catalog | null>(null);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editing, setEditing] = useState<Appointment | null>(null);
	const [cancelling, setCancelling] = useState<Appointment | null>(null);
	const [serviceId, setServiceId] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [date, setDate] = useState(today);
	const [time, setTime] = useState("");
	const [slots, setSlots] = useState<Slot[]>([]);
	const [closedDay, setClosedDay] = useState(false);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

	const load = useCallback(async (nextPage = 0) => {
		setLoading(true); setError("");
		try {
			const params = new URLSearchParams({ page: String(nextPage), scope: view === "history" ? "history" : "upcoming" });
			if (view === "history") params.set("year", String(selectedYear));
			const response = await fetch(`/api/account/appointments?${params.toString()}`, { cache: "no-store" });
			const result = await response.json() as { error?: string; customer?: { name: string; email: string }; appointments?: Appointment[]; hasMore?: boolean };
			if (response.status === 401) { router.replace("/account/login"); return; }
			if (!response.ok) throw new Error(result.error ?? "Impossibile caricare le prenotazioni.");
			setProfile(result.customer ?? null); setItems((current) => nextPage === 0 ? result.appointments ?? [] : [...current, ...(result.appointments ?? [])]);
			setPage(nextPage); setHasMore(Boolean(result.hasMore));
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Impossibile caricare le prenotazioni."); }
		finally { setLoading(false); }
	}, [router, selectedYear, view]);

	useEffect(() => { void load(); }, [load]);
	useEffect(() => {
		if (!editing || catalog) return;
		void fetch("/api/booking").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setCatalog(result as Catalog); }).catch(() => setError("Impossibile caricare i servizi disponibili."));
	}, [editing, catalog]);
	useEffect(() => {
		if (!editing || !serviceId || !employeeId || !date) return;
		let active = true; setTime(""); setClosedDay(false); setSlotsLoading(true);
		void fetch(`/api/account/appointments/${editing.id}/slots?serviceId=${encodeURIComponent(serviceId)}&employeeId=${encodeURIComponent(employeeId)}&date=${date}`)
			.then(async (response) => { const result = await response.json() as { slots?: Slot[]; closed?: boolean; error?: string }; if (!response.ok) throw new Error(result.error); if (active) { setSlots(result.slots ?? []); setClosedDay(Boolean(result.closed)); } })
			.catch((reason) => { if (active) { setSlots([]); setClosedDay(false); setError(reason instanceof Error ? reason.message : "Orari non disponibili."); } })
			.finally(() => { if (active) setSlotsLoading(false); });
		return () => { active = false; };
	}, [editing, serviceId, employeeId, date]);

	const years = Array.from({ length: new Date().getFullYear() - 1999 }, (_, index) => new Date().getFullYear() - index);
	function beginEdit(item: Appointment) { setEditing(item); setServiceId(item.serviceId); setEmployeeId(item.employeeId); setDate(localDate(item.startTime)); setTime(""); setError(""); }
	async function save(event: FormEvent) {
		event.preventDefault(); if (!editing || !time) return; setSaving(true); setError("");
		try {
			const response = await fetch(`/api/account/appointments/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, employeeId, date, time }) });
			const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Modifica non riuscita.");
			setEditing(null); await load();
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Modifica non riuscita."); }
		finally { setSaving(false); }
	}
	async function cancel(item: Appointment) {
		setSaving(true); setError("");
		try {
			const response = await fetch(`/api/account/appointments/${item.id}/cancel`, { method: "POST" });
			const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Annullamento non riuscito.");
			setCancelling(null);
			await load();
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Annullamento non riuscito."); }
		finally { setSaving(false); }
	}

	const chosenService = catalog?.services.find((service) => service.id === serviceId);
	return <CustomerPortalShell profile={profile}>
		{error ? <p role="alert" className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
		{editing ? <EditForm catalog={catalog} serviceId={serviceId} employeeId={employeeId} date={date} time={time} slots={slots} closedDay={closedDay} slotsLoading={slotsLoading} saving={saving} price={chosenService && chosenService.id !== editing.serviceId ? chosenService.price : editing.price} onService={setServiceId} onEmployee={setEmployeeId} onDate={setDate} onTime={setTime} onCancel={() => setEditing(null)} onSubmit={save} /> : view === "history" ? <HistoryView items={items} years={years} selectedYear={selectedYear} loading={loading} hasMore={hasMore} onYear={setSelectedYear} onMore={() => void load(page + 1)} /> : <DashboardView items={items} loading={loading} saving={saving} onEdit={beginEdit} onCancel={setCancelling} />}
		{cancelling ? <CancelDialog item={cancelling} saving={saving} onClose={() => setCancelling(null)} onConfirm={() => void cancel(cancelling)} /> : null}
	</CustomerPortalShell>;
}

function DashboardView({ items, loading, saving, onEdit, onCancel }: { items: Appointment[]; loading: boolean; saving: boolean; onEdit: (item: Appointment) => void; onCancel: (item: Appointment) => void }) {
	return <><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Dashboard</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">I tuoi appuntamenti</h1><p className="mt-2 text-sm text-zinc-600">Qui trovi i prossimi appuntamenti e potrai vedere nuove funzioni man mano che verranno aggiunte.</p></div><Link href="/book?from=account" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">Prenota un servizio</Link></header><section className="mt-8 grid gap-4 sm:grid-cols-3"><Summary label="Prossimi appuntamenti" value={loading ? "—" : String(items.length)} /><Summary label="Modifiche online" value="Fino a 24 h prima" /><Summary label="Storico" value="Disponibile" /></section><section className="mt-10"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-zinc-500" /><h2 className="text-xl font-semibold">Prossimi appuntamenti</h2></div>{loading ? <p className="mt-4 text-sm text-zinc-600">Caricamento prenotazioni...</p> : <div className="mt-4 grid gap-4">{items.length ? items.map((item) => <BookingCard key={item.id} item={item} isFuture saving={saving} onEdit={() => onEdit(item)} onCancel={() => onCancel(item)} />) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-7 text-sm text-zinc-600">Non hai appuntamenti in programma. <Link href="/book?from=account" className="font-medium underline">Prenota ora</Link>.</div>}</div>}</section></>;
}

function HistoryView({ items, years, selectedYear, loading, hasMore, onYear, onMore }: { items: Appointment[]; years: number[]; selectedYear: number; loading: boolean; hasMore: boolean; onYear: (year: number) => void; onMore: () => void }) {
	return <><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Storico</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Tutte le prenotazioni</h1><p className="mt-2 text-sm text-zinc-600">Consulta gli appuntamenti passati e quelli annullati per anno.</p></header><div className="mt-7 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4"><SlidersHorizontal className="size-4 text-zinc-500" /><label className="flex items-center gap-3 text-sm font-medium">Anno<Select value={String(selectedYear)} onValueChange={(value) => onYear(Number(value))}><SelectTrigger className="min-h-10 w-28 rounded-lg bg-white"><SelectValue /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select></label></div>{loading ? <p className="mt-7 text-sm text-zinc-600">Caricamento storico...</p> : <section className="mt-7 grid gap-4">{items.length ? items.map((item) => <BookingCard key={item.id} item={item} saving={false} />) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-7 text-sm text-zinc-600">Nessuna prenotazione nello storico del {selectedYear}.</div>}{hasMore ? <button type="button" onClick={onMore} className="min-h-11 justify-self-start rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium">Carica altre prenotazioni</button> : null}</section>}</>;
}

function EditForm({ catalog, serviceId, employeeId, date, time, slots, closedDay, slotsLoading, saving, price, onService, onEmployee, onDate, onTime, onCancel, onSubmit }: { catalog: Catalog | null; serviceId: string; employeeId: string; date: string; time: string; slots: Slot[]; closedDay: boolean; slotsLoading: boolean; saving: boolean; price: number | string | null; onService: (value: string) => void; onEmployee: (value: string) => void; onDate: (value: string) => void; onTime: (value: string) => void; onCancel: () => void; onSubmit: (event: FormEvent) => void }) {
	const actionsRef = useRef<HTMLDivElement>(null);
	const canSave = Boolean(time) && !closedDay && !slotsLoading && slots.some((slot) => slot.time === time && !slot.disabled);

	function selectTime(nextTime: string) {
		onTime(nextTime);
		if (!window.matchMedia("(max-width: 767px)").matches) return;
		window.requestAnimationFrame(() => actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
	}

	return <section className="mx-auto max-w-3xl"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Appuntamento</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Modifica prenotazione</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Le modifiche sono disponibili fino a 24 ore prima dell&apos;appuntamento.</p></div><button type="button" onClick={onCancel} aria-label="Torna alle prenotazioni" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/35"><ArrowLeft aria-hidden="true" className="size-5" /></button></header><form onSubmit={onSubmit} className="mt-7 grid gap-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7"><label className="text-sm font-medium text-zinc-800">Servizio<Select value={serviceId} onValueChange={onService}><SelectTrigger className="mt-2 min-h-11 rounded-lg bg-white"><SelectValue placeholder="Seleziona servizio" /></SelectTrigger><SelectContent>{catalog?.services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent></Select></label><label className="text-sm font-medium text-zinc-800">Addetto<Select value={employeeId} onValueChange={onEmployee}><SelectTrigger className="mt-2 min-h-11 rounded-lg bg-white"><SelectValue placeholder="Seleziona addetto" /></SelectTrigger><SelectContent>{catalog?.employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}</SelectContent></Select></label><div className="text-sm font-medium text-zinc-800">Giorno<CompactDatePicker value={date} onChange={onDate} /></div><div className="sm:col-span-2"><p className="text-sm font-medium text-zinc-800">Orario</p>{slotsLoading ? <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">Caricamento orari disponibili...</p> : closedDay ? <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Il salone è chiuso in questo giorno. Seleziona un&apos;altra data per vedere gli orari disponibili.</p> : slots.length === 0 ? <p role="status" className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">Non ci sono orari disponibili per questa data. Seleziona un altro giorno.</p> : <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{slots.map((slot) => <button key={slot.time} type="button" disabled={slot.disabled} onClick={() => selectTime(slot.time)} aria-pressed={time === slot.time} className={`min-h-11 rounded-lg border text-sm font-medium transition ${time === slot.time ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"} disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400`}>{slot.time}</button>)}</div>}</div><div className="rounded-xl bg-zinc-50 p-4 sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Prezzo previsto</p><p className="mt-1 font-semibold text-zinc-900">{priceLabel(price)}</p></div><div ref={actionsRef} className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 pt-5 sm:col-span-2"><button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50">Annulla</button><button disabled={!canSave || saving} className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300">{saving ? "Salvataggio..." : "Salva modifica"}</button></div></form></section>;
}

function CompactDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
	const [open, setOpen] = useState(false);
	const selected = toLocalDate(value);
	return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="outline" className="mt-2 h-11 w-full justify-between rounded-xl px-3 font-normal"><span>{compactDateFormatter.format(selected)}</span><CalendarDays className="size-4 text-zinc-500" /></Button></PopoverTrigger><PopoverContent align="start" className="w-[calc(100vw-2rem)] max-w-[22rem] p-2 sm:w-auto"><Calendar mode="single" locale={it} weekStartsOn={1} timeZone="Europe/Rome" selected={selected} onSelect={(next) => { if (!next) return; onChange(toIsoDate(next)); setOpen(false); }} disabled={{ before: toLocalDate(today()), after: toLocalDate(maxDate()) }} /></PopoverContent></Popover>;
}

function CancelDialog({ item, saving, onClose, onConfirm }: { item: Appointment; saving: boolean; onClose: () => void; onConfirm: () => void }) {
	return <div role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="fixed inset-0 z-[70] flex items-end bg-black/35 p-4 sm:items-center sm:justify-center"><button type="button" aria-label="Chiudi finestra di annullamento" onClick={onClose} disabled={saving} className="absolute inset-0" /><section className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700"><AlertTriangle className="size-5" /></div><button type="button" aria-label="Chiudi" onClick={onClose} disabled={saving} className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50"><X className="size-5" /></button></div><h2 id="cancel-booking-title" className="mt-4 text-xl font-semibold text-zinc-900">Annullare la prenotazione?</h2><p className="mt-2 text-sm leading-6 text-zinc-600">L&apos;appuntamento verrà annullato e questo spazio tornerà disponibile per il salone.</p><div className="mt-5 rounded-xl bg-zinc-50 p-4"><p className="font-semibold text-zinc-900">{item.serviceName}</p><p className="mt-1 text-sm text-zinc-600">{dateFormatter.format(new Date(item.startTime))} · {timeFormatter.format(new Date(item.startTime))}</p><p className="mt-1 text-sm text-zinc-600">Con {item.employeeName}</p></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50">Mantieni prenotazione</button><button type="button" onClick={onConfirm} disabled={saving} className="min-h-11 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300">{saving ? "Annullamento..." : "Conferma annullamento"}</button></div></section></div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-lg font-semibold text-zinc-900">{value}</p></div>; }

function BookingCard({ item, isFuture = false, saving, onEdit, onCancel }: { item: Appointment; isFuture?: boolean; saving: boolean; onEdit?: () => void; onCancel?: () => void }) {
	const isCancelled = item.status === "cancelled";
	return <article className="rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Scissors className="size-4 text-zinc-500" /><h3 className="text-lg font-semibold">{item.serviceName}</h3></div><p className="mt-2 text-sm text-zinc-600">Con {item.employeeName}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isCancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{isCancelled ? "Annullata" : "Confermata"}</span></div><div className="mt-5 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2"><p className="flex items-center gap-2 capitalize"><CalendarDays className="size-4 text-zinc-500" />{dateFormatter.format(new Date(item.startTime))}</p><p className="flex items-center gap-2"><Clock3 className="size-4 text-zinc-500" />{timeFormatter.format(new Date(item.startTime))}–{timeFormatter.format(new Date(item.endTime))}</p></div><p className="mt-3 text-sm text-zinc-600">{item.durationMinutes ?? "—"} min · {priceLabel(item.price)}</p>{item.canChange && onEdit && onCancel ? <div className="mt-5 flex flex-wrap gap-3"><button disabled={saving} onClick={onEdit} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium">Modifica</button><button disabled={saving} onClick={onCancel} className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700">Annulla</button></div> : isFuture && item.status === "scheduled" ? <p className="mt-4 text-xs text-zinc-500">Per modificare o annullare nelle ultime 24 ore, contatta il salone.</p> : null}</article>;
}
