"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Appointment = { id: string; serviceId: string; employeeId: string; serviceName: string; employeeName: string; startTime: string; endTime: string; status: string; price: number | string | null; durationMinutes: number | null; canChange: boolean; source: string };
type Catalog = { services: Array<{ id: string; name: string; price: number | string | null; duration: number }>; employees: Array<{ id: string; name: string }> };
type Slot = { time: string; disabled: boolean };
const dateFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const localDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const today = () => localDate(new Date().toISOString());
const maxDate = () => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 27); return date.toISOString().slice(0, 10); };
const priceLabel = (price: number | string | null) => price == null ? "Da definire in salone" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(price));

export function CustomerBookings() {
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
	const [now] = useState(() => Date.now());
	const load = useCallback(async (nextPage = 0) => {
		setLoading(true); setError("");
		try {
			const response = await fetch(`/api/account/appointments?page=${nextPage}`, { cache: "no-store" });
			const result = await response.json() as { error?: string; customer?: { name: string; email: string }; appointments?: Appointment[]; hasMore?: boolean };
			if (response.status === 401) { router.replace("/account/login"); return; }
			if (!response.ok) throw new Error(result.error ?? "Impossibile caricare le prenotazioni.");
			setProfile(result.customer ?? null); setItems((current) => nextPage === 0 ? result.appointments ?? [] : [...current, ...(result.appointments ?? [])]);
			setPage(nextPage); setHasMore(Boolean(result.hasMore));
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Impossibile caricare le prenotazioni."); }
		finally { setLoading(false); }
	}, [router]);
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
	const future = useMemo(() => items.filter((item) => item.status === "scheduled" && new Date(item.startTime).getTime() > now).sort((a, b) => a.startTime.localeCompare(b.startTime)), [items, now]);
	const history = useMemo(() => items.filter((item) => !future.some((futureItem) => futureItem.id === item.id)), [items, future]);
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
	async function signOut() { await getSupabaseBrowserClient().auth.signOut(); router.replace("/account/login"); router.refresh(); }
	const chosenService = catalog?.services.find((service) => service.id === serviceId);
	return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
		<header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Area clienti</p><h1 className="mt-1 text-3xl font-semibold">Le mie prenotazioni</h1>{profile ? <p className="mt-2 text-sm text-zinc-600">{profile.name} · {profile.email}</p> : null}</div><button onClick={() => void signOut()} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm">Esci</button></header>
		{error ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
		{loading && !items.length ? <p className="mt-8">Caricamento prenotazioni...</p> : null}
		{editing ? <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-semibold">Modifica prenotazione</h2><p className="mt-2 text-sm text-zinc-600">Puoi cambiare i dettagli fino a 24 ore prima dell&apos;appuntamento. Il nuovo orario deve essere disponibile.</p><form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
			<label className="text-sm font-medium">Servizio<select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3">{catalog?.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
			<label className="text-sm font-medium">Addetto<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3">{catalog?.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
			<label className="text-sm font-medium">Giorno<input type="date" min={today()} max={maxDate()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3" /></label>
			<div className="sm:col-span-2"><p className="text-sm font-medium">Orario</p>{slotsLoading ? <p className="mt-2 text-sm">Caricamento orari...</p> : <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{slots.map((slot) => <button key={slot.time} type="button" disabled={slot.disabled} onClick={() => setTime(slot.time)} aria-pressed={time === slot.time} className={`min-h-11 rounded-lg border text-sm ${time === slot.time ? "bg-zinc-900 text-white" : "bg-white"} disabled:bg-zinc-100 disabled:text-zinc-400`}>{slot.time}</button>)}</div>}{!slotsLoading && !slots.some((slot) => !slot.disabled) ? <p className="mt-2 text-sm text-zinc-600">Nessun orario disponibile.</p> : null}</div>
			<p className="text-sm sm:col-span-2">{chosenService && chosenService.id !== editing.serviceId ? `Nuovo prezzo: ${priceLabel(chosenService.price)}` : `Prezzo: ${priceLabel(editing.price)}`}</p>
			<div className="flex gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-lg border px-4">Indietro</button><button disabled={!time || saving} className="min-h-11 rounded-lg bg-zinc-900 px-4 text-white disabled:opacity-50">{saving ? "Salvataggio..." : "Conferma modifica"}</button></div>
		</form></section> : null}
		{!editing ? <><section className="mt-8"><h2 className="text-xl font-semibold">Prossimi appuntamenti</h2><div className="mt-4 grid gap-4">{future.length ? future.map((item) => <BookingCard key={item.id} item={item} isFuture saving={saving} onEdit={() => beginEdit(item)} onCancel={() => void cancel(item)} />) : <p className="rounded-xl bg-white p-5 text-sm text-zinc-600">Nessun appuntamento in programma. <Link href="/service" className="underline">Prenota un servizio</Link>.</p>}</div></section><section className="mt-10"><h2 className="text-xl font-semibold">Storico</h2><div className="mt-4 grid gap-4">{history.length ? history.map((item) => <BookingCard key={item.id} item={item} isFuture={false} saving={saving} onEdit={() => beginEdit(item)} onCancel={() => void cancel(item)} />) : <p className="text-sm text-zinc-600">Nessuna prenotazione passata.</p>}</div></section>{hasMore ? <button disabled={loading} onClick={() => void load(page + 1)} className="mt-6 min-h-11 rounded-lg border px-4">Carica altre prenotazioni</button> : null}</> : null}
	</main>;
}

function BookingCard({ item, isFuture, saving, onEdit, onCancel }: { item: Appointment; isFuture: boolean; saving: boolean; onEdit: () => void; onCancel: () => void }) {
	return <article className="rounded-xl border border-zinc-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-lg font-semibold">{item.serviceName}</h3><p className="mt-1 text-sm text-zinc-600">{item.employeeName}</p></div><span className="text-sm text-zinc-600">{item.status === "cancelled" ? "Annullata" : item.status === "scheduled" ? "Confermata" : item.status}</span></div><p className="mt-4 text-sm font-medium capitalize">{dateFormatter.format(new Date(item.startTime))} · {timeFormatter.format(new Date(item.startTime))}–{timeFormatter.format(new Date(item.endTime))}</p><p className="mt-1 text-sm text-zinc-600">{item.durationMinutes ?? "—"} min · {priceLabel(item.price)}</p>{item.canChange ? <div className="mt-5 flex gap-3"><button disabled={saving} onClick={onEdit} className="min-h-10 rounded-lg border px-4 text-sm font-medium">Modifica</button><button disabled={saving} onClick={onCancel} className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700">Annulla</button></div> : isFuture ? <p className="mt-4 text-xs text-zinc-500">Per modificare o annullare nelle ultime 24 ore, contatta il salone.</p> : null}</article>;
}
