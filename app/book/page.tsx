"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Service = { id: string; name: string; duration: number | null; categories: string[] };
type Employee = { id: string; name: string };
type Slot = { time: string; disabled: boolean };
type ServiceCategory = "tutti" | "donna" | "uomo";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const formatDate = (value: string) => new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));

export default function BookPage() {
	return <Suspense fallback={<BookingPageFallback />}><BookPageContent /></Suspense>;
}

function BookPageContent() {
	const params = useSearchParams();
	const [services, setServices] = useState<Service[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [serviceId, setServiceId] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [category, setCategory] = useState<ServiceCategory>("tutti");
	const [date, setDate] = useState(today);
	const [slots, setSlots] = useState<Slot[]>([]);
	const [time, setTime] = useState("");
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [complete, setComplete] = useState(false);
	const dates = useMemo(() => {
		const first = new Date(`${today()}T12:00:00Z`);
		return Array.from({ length: 28 }, (_, index) => { const next = new Date(first); next.setUTCDate(first.getUTCDate() + index); return next.toISOString().slice(0, 10); });
	}, []);
	const filteredServices = useMemo(() => services.filter((service) =>
		category === "tutti" || service.categories.some((item) => item.trim().toLocaleLowerCase("it-IT") === category)
	), [category, services]);

	useEffect(() => {
		void fetch("/api/booking").then(async (response) => {
			const data = await response.json(); if (!response.ok) throw new Error(data.error);
			setServices(data.services); setEmployees(data.employees);
			const requested = data.services.find((item: Service) => item.name === params.get("servizio")) ?? data.services[0];
			setServiceId(requested?.id ?? ""); setEmployeeId(data.employees[0]?.id ?? "");
		}).catch((error: Error) => toast.error(error.message)).finally(() => setLoading(false));
	}, [params]);

	useEffect(() => {
		if (filteredServices.some((service) => service.id === serviceId)) return;
		setServiceId(filteredServices[0]?.id ?? "");
	}, [filteredServices, serviceId]);

	useEffect(() => {
		if (!serviceId || !employeeId) return;
		setTime("");
		void fetch(`/api/booking?serviceId=${encodeURIComponent(serviceId)}&employeeId=${encodeURIComponent(employeeId)}&date=${date}`)
			.then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setSlots(data.slots); })
			.catch((error: Error) => { setSlots([]); toast.error(error.message); });
	}, [date, employeeId, serviceId]);

	async function submit(event: FormEvent) {
		event.preventDefault(); setSaving(true);
		try {
			const response = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, employeeId, date, time, name, phone, email }) });
			const result = await response.json(); if (!response.ok) throw new Error(result.error);
			setComplete(true);
		} catch (error) { toast.error(error instanceof Error ? error.message : "Impossibile inviare la prenotazione."); }
		finally { setSaving(false); }
	}

	if (complete) return <div className="min-h-[70vh] bg-zinc-50 text-zinc-900"><main className="mx-auto max-w-xl px-4 py-20"><div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"><h1 className="text-2xl font-semibold">Prenotazione confermata</h1><p className="mt-2 text-zinc-600">Ti aspettiamo {formatDate(date)} alle {time}.</p><Link href="/" className="mt-5 inline-block rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Torna alla home</Link></div></main></div>;

	return <div className="min-h-screen bg-zinc-950 text-zinc-100"><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-16">
		<header className="max-w-xl"><p className="text-xs font-semibold tracking-[.18em] text-zinc-400">PRENOTA ONLINE</p><h1 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">Scegli il tuo appuntamento</h1><p className="mt-2 text-sm leading-relaxed text-zinc-300">Gli orari occupati sono mostrati ma non selezionabili.</p></header>
		{loading ? <p className="mt-8 text-sm text-zinc-300">Caricamento disponibilità...</p> : <form onSubmit={submit} className="mt-7 grid gap-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:mt-8 sm:gap-7 sm:p-7">
			<Field label="Per chi è il servizio?"><div className="flex flex-wrap gap-2">{(["tutti", "donna", "uomo"] as const).map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold capitalize ${category === item ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}>{item === "tutti" ? "Tutti" : item}</button>)}</div></Field>
			<div className="grid gap-4 sm:grid-cols-2"><Field label="Servizio"><Select value={serviceId} onValueChange={setServiceId}><SelectTrigger className="min-h-11"><SelectValue placeholder="Seleziona servizio" /></SelectTrigger><SelectContent>{filteredServices.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.duration ? ` · ${item.duration} min` : ""}</SelectItem>)}</SelectContent></Select>{filteredServices.length === 0 ? <p className="mt-2 text-xs text-zinc-500">Nessun servizio in questa categoria.</p> : null}</Field><Field label="Operatore"><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger className="min-h-11"><SelectValue placeholder="Seleziona operatore" /></SelectTrigger><SelectContent>{employees.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field></div>
			<Field label="Giorno"><div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-7">{dates.map((item) => <button key={item} type="button" aria-pressed={date === item} onClick={() => setDate(item)} className={`min-h-12 min-w-24 shrink-0 snap-start rounded-xl border px-3 py-2 text-xs font-semibold capitalize sm:min-w-0 sm:px-2 ${date === item ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}>{formatDate(item)}</button>)}</div></Field>
			<Field label="Orario"><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">{slots.map((item) => <button key={item.time} type="button" disabled={item.disabled} aria-pressed={time === item.time} onClick={() => setTime(item.time)} className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold ${time === item.time ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"} ${item.disabled ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-100" : ""}`}>{item.time}</button>)}</div>{slots.length === 0 && <p className="text-sm text-zinc-600">Nessun orario disponibile in questo giorno.</p>}</Field>
			<div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo"><input required value={name} onChange={(event) => setName(event.target.value)} className="input" /></Field><Field label="Telefono"><input value={phone} onChange={(event) => setPhone(event.target.value)} className="input" /></Field><Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" /></Field></div>
			<p className="text-xs leading-relaxed text-zinc-500">Inserisci telefono o email per completare la prenotazione.</p><button disabled={saving || !time} className="min-h-12 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300">{saving ? "Invio..." : "Conferma prenotazione"}</button>
		</form>}
		<style jsx>{`.input { width:100%; min-height:2.75rem; border:1px solid #d4d4d8; border-radius:.75rem; padding:.6rem .75rem; font-size:1rem; color:#18181b; background:#fff; }`}</style>
	</main></div>;
}

function BookingPageFallback() {
	return <div className="min-h-screen bg-zinc-950 text-zinc-100"><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-16"><p className="mt-8 text-sm text-zinc-300">Caricamento disponibilità...</p></main></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="mb-2 block text-sm font-semibold text-zinc-800">{label}</label>{children}</div>; }
