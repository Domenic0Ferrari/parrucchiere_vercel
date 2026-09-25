"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, Scissors, SlidersHorizontal } from "lucide-react";
import { CustomerPortalShell } from "@/components/account/customer-portal-shell";

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
	const [serviceId, setServiceId] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [date, setDate] = useState(today);
	const [time, setTime] = useState("");
	const [slots, setSlots] = useState<Slot[]>([]);
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
		let active = true; setTime(""); setSlotsLoading(true);
		void fetch(`/api/account/appointments/${editing.id}/slots?serviceId=${encodeURIComponent(serviceId)}&employeeId=${encodeURIComponent(employeeId)}&date=${date}`)
			.then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); if (active) setSlots(result.slots ?? []); })
			.catch((reason) => { if (active) { setSlots([]); setError(reason instanceof Error ? reason.message : "Orari non disponibili."); } })
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
		if (!window.confirm("Vuoi annullare questa prenotazione?")) return;
		setSaving(true); setError("");
		try {
			const response = await fetch(`/api/account/appointments/${item.id}/cancel`, { method: "POST" });
			const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Annullamento non riuscito.");
			await load();
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Annullamento non riuscito."); }
		finally { setSaving(false); }
	}

	const chosenService = catalog?.services.find((service) => service.id === serviceId);
	return <CustomerPortalShell profile={profile}>
		{error ? <p role="alert" className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
		{editing ? <EditForm catalog={catalog} serviceId={serviceId} employeeId={employeeId} date={date} time={time} slots={slots} slotsLoading={slotsLoading} saving={saving} price={chosenService && chosenService.id !== editing.serviceId ? chosenService.price : editing.price} onService={setServiceId} onEmployee={setEmployeeId} onDate={setDate} onTime={setTime} onCancel={() => setEditing(null)} onSubmit={save} /> : view === "history" ? <HistoryView items={items} years={years} selectedYear={selectedYear} loading={loading} hasMore={hasMore} onYear={setSelectedYear} onMore={() => void load(page + 1)} /> : <DashboardView items={items} loading={loading} saving={saving} onEdit={beginEdit} onCancel={cancel} />}
	</CustomerPortalShell>;
}

function DashboardView({ items, loading, saving, onEdit, onCancel }: { items: Appointment[]; loading: boolean; saving: boolean; onEdit: (item: Appointment) => void; onCancel: (item: Appointment) => void }) {
	return <><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Dashboard</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">I tuoi appuntamenti</h1><p className="mt-2 text-sm text-zinc-600">Qui trovi i prossimi appuntamenti e potrai vedere nuove funzioni man mano che verranno aggiunte.</p></div><Link href="/book?from=account" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">Prenota un servizio</Link></header><section className="mt-8 grid gap-4 sm:grid-cols-3"><Summary label="Prossimi appuntamenti" value={loading ? "—" : String(items.length)} /><Summary label="Modifiche online" value="Fino a 24 h prima" /><Summary label="Storico" value="Disponibile" /></section><section className="mt-10"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-zinc-500" /><h2 className="text-xl font-semibold">Prossimi appuntamenti</h2></div>{loading ? <p className="mt-4 text-sm text-zinc-600">Caricamento prenotazioni...</p> : <div className="mt-4 grid gap-4">{items.length ? items.map((item) => <BookingCard key={item.id} item={item} isFuture saving={saving} onEdit={() => onEdit(item)} onCancel={() => onCancel(item)} />) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-7 text-sm text-zinc-600">Non hai appuntamenti in programma. <Link href="/book?from=account" className="font-medium underline">Prenota ora</Link>.</div>}</div>}</section></>;
}

function HistoryView({ items, years, selectedYear, loading, hasMore, onYear, onMore }: { items: Appointment[]; years: number[]; selectedYear: number; loading: boolean; hasMore: boolean; onYear: (year: number) => void; onMore: () => void }) {
	return <><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Storico</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Tutte le prenotazioni</h1><p className="mt-2 text-sm text-zinc-600">Consulta gli appuntamenti passati e quelli annullati per anno.</p></header><div className="mt-7 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4"><SlidersHorizontal className="size-4 text-zinc-500" /><label className="flex items-center gap-3 text-sm font-medium">Anno<select value={selectedYear} onChange={(event) => onYear(Number(event.target.value))} className="min-h-10 rounded-lg border border-zinc-300 bg-white px-3">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>{loading ? <p className="mt-7 text-sm text-zinc-600">Caricamento storico...</p> : <section className="mt-7 grid gap-4">{items.length ? items.map((item) => <BookingCard key={item.id} item={item} saving={false} />) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-7 text-sm text-zinc-600">Nessuna prenotazione nello storico del {selectedYear}.</div>}{hasMore ? <button type="button" onClick={onMore} className="min-h-11 justify-self-start rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium">Carica altre prenotazioni</button> : null}</section>}</>;
}

function EditForm({ catalog, serviceId, employeeId, date, time, slots, slotsLoading, saving, price, onService, onEmployee, onDate, onTime, onCancel, onSubmit }: { catalog: Catalog | null; serviceId: string; employeeId: string; date: string; time: string; slots: Slot[]; slotsLoading: boolean; saving: boolean; price: number | string | null; onService: (value: string) => void; onEmployee: (value: string) => void; onDate: (value: string) => void; onTime: (value: string) => void; onCancel: () => void; onSubmit: (event: FormEvent) => void }) {
	return <section><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Appuntamento</p><h1 className="mt-1 text-3xl font-semibold">Modifica prenotazione</h1><p className="mt-2 text-sm text-zinc-600">Le modifiche sono disponibili fino a 24 ore prima dell&apos;appuntamento.</p></header><form onSubmit={onSubmit} className="mt-7 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:grid-cols-2 sm:p-7"><label className="text-sm font-medium">Servizio<select value={serviceId} onChange={(event) => onService(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3">{catalog?.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><label className="text-sm font-medium">Addetto<select value={employeeId} onChange={(event) => onEmployee(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3">{catalog?.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label className="text-sm font-medium">Giorno<input type="date" min={today()} max={maxDate()} value={date} onChange={(event) => onDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3" /></label><div className="sm:col-span-2"><p className="text-sm font-medium">Orario</p>{slotsLoading ? <p className="mt-2 text-sm text-zinc-600">Caricamento orari...</p> : <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{slots.map((slot) => <button key={slot.time} type="button" disabled={slot.disabled} onClick={() => onTime(slot.time)} aria-pressed={time === slot.time} className={`min-h-11 rounded-lg border text-sm ${time === slot.time ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"} disabled:bg-zinc-100 disabled:text-zinc-400`}>{slot.time}</button>)}</div>}</div><p className="text-sm text-zinc-600 sm:col-span-2">Prezzo: {priceLabel(price)}</p><div className="flex flex-wrap gap-3 sm:col-span-2"><button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium">Indietro</button><button disabled={!time || saving} className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Salvataggio..." : "Conferma modifica"}</button></div></form></section>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-lg font-semibold text-zinc-900">{value}</p></div>; }

function BookingCard({ item, isFuture = false, saving, onEdit, onCancel }: { item: Appointment; isFuture?: boolean; saving: boolean; onEdit?: () => void; onCancel?: () => void }) {
	const isCancelled = item.status === "cancelled";
	return <article className="rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Scissors className="size-4 text-zinc-500" /><h3 className="text-lg font-semibold">{item.serviceName}</h3></div><p className="mt-2 text-sm text-zinc-600">Con {item.employeeName}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isCancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{isCancelled ? "Annullata" : "Confermata"}</span></div><div className="mt-5 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2"><p className="flex items-center gap-2 capitalize"><CalendarDays className="size-4 text-zinc-500" />{dateFormatter.format(new Date(item.startTime))}</p><p className="flex items-center gap-2"><Clock3 className="size-4 text-zinc-500" />{timeFormatter.format(new Date(item.startTime))}–{timeFormatter.format(new Date(item.endTime))}</p></div><p className="mt-3 text-sm text-zinc-600">{item.durationMinutes ?? "—"} min · {priceLabel(item.price)}</p>{item.canChange && onEdit && onCancel ? <div className="mt-5 flex flex-wrap gap-3"><button disabled={saving} onClick={onEdit} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium">Modifica</button><button disabled={saving} onClick={onCancel} className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700">Annulla</button></div> : isFuture && item.status === "scheduled" ? <p className="mt-4 text-xs text-zinc-500">Per modificare o annullare nelle ultime 24 ore, contatta il salone.</p> : null}</article>;
}
