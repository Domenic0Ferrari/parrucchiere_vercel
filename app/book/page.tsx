"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { BookingConfirmationCard, type BookingConfirmation } from "@/components/booking/booking-confirmation-card";

type Service = { id: string; name: string; duration: number | null; categories: string[] };
type Employee = { id: string; name: string };
type Slot = { time: string; disabled: boolean };
type ServiceCategory = "tutti" | "donna" | "uomo";
type OpeningHour = { day_of_week: number; is_open: boolean };
type SalonClosure = { start_date: string; end_date: string; all_day: boolean };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const formatDate = (value: string) => new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));

function dayOfWeek(date: string) {
	const day = new Date(`${date}T12:00:00Z`).getUTCDay();
	return day === 0 ? 7 : day;
}

function isClosedDay(date: string, openingHours: OpeningHour[], closures: SalonClosure[]) {
	if (closures.some((closure) => closure.all_day && date >= closure.start_date && date <= closure.end_date)) return true;
	// If opening hours have been configured, a missing or closed weekday cannot be booked either.
	return openingHours.length > 0 && !openingHours.some((hour) => hour.day_of_week === dayOfWeek(date) && hour.is_open);
}

export default function BookPage() {
	return <Suspense fallback={<BookingPageFallback />}><BookPageContent /></Suspense>;
}

function BookPageContent() {
	const params = useSearchParams();
	const requestedServiceName = params.get("servizio");
	const fromAccount = params.get("from") === "account";
	const [services, setServices] = useState<Service[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [serviceId, setServiceId] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [category, setCategory] = useState<ServiceCategory>("tutti");
	const [date, setDate] = useState(today);
	const [slots, setSlots] = useState<Slot[]>([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
	const [closures, setClosures] = useState<SalonClosure[]>([]);
	const [time, setTime] = useState("");
	const [name, setName] = useState("");
	const [nameError, setNameError] = useState(false);
	const nameErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const continueToDetailsRef = useRef<HTMLButtonElement | null>(null);
	const bookingFormRef = useRef<HTMLFormElement | null>(null);
	const bookingRequestIdRef = useRef<string | null>(null);
	const datesScrollerRef = useRef<HTMLDivElement | null>(null);
	const shouldScrollToStepRef = useRef(false);
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [accountLinked, setAccountLinked] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
	const [step, setStep] = useState<1 | 2 | 3>(1);
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
			setServices(data.services); setEmployees(data.employees); setOpeningHours(data.openingHours ?? []); setClosures(data.closures ?? []);
			const requested = data.services.find((item: Service) => item.name === requestedServiceName) ?? data.services[0];
			setServiceId(requested?.id ?? ""); setEmployeeId(data.employees[0]?.id ?? "");
		}).catch((error: Error) => toast.error(error.message)).finally(() => setLoading(false));
	}, [requestedServiceName]);

	useEffect(() => {
		void fetch("/api/account/appointments?page=0").then(async (response) => {
			if (!response.ok) return;
			const data = await response.json() as { customer?: { name: string; email: string; phone: string | null } };
			if (!data.customer) return;
			setName(data.customer.name); setEmail(data.customer.email); setPhone(data.customer.phone ?? ""); setAccountLinked(true);
		}).catch(() => {});
	}, []);

	useEffect(() => {
		const firstBookableDate = dates.find((item) => !isClosedDay(item, openingHours, closures));
		if (firstBookableDate && isClosedDay(date, openingHours, closures)) setDate(firstBookableDate);
	}, [closures, date, dates, openingHours]);

	useEffect(() => () => {
		if (nameErrorTimeout.current) clearTimeout(nameErrorTimeout.current);
	}, []);

	useEffect(() => {
		if (filteredServices.some((service) => service.id === serviceId)) return;
		setServiceId(filteredServices[0]?.id ?? "");
	}, [filteredServices, serviceId]);

	useEffect(() => {
		if (!shouldScrollToStepRef.current) return;
		shouldScrollToStepRef.current = false;
		if (!window.matchMedia("(max-width: 767px)").matches) return;
		const scrollToStepStart = () => bookingFormRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
		window.requestAnimationFrame(scrollToStepStart);
		const timer = window.setTimeout(scrollToStepStart, 80);
		return () => window.clearTimeout(timer);
	}, [step]);

	useEffect(() => {
		if (!serviceId || !employeeId) return;
		let active = true;
		setTime("");
		setSlotsLoading(true);
		void fetch(`/api/booking?serviceId=${encodeURIComponent(serviceId)}&employeeId=${encodeURIComponent(employeeId)}&date=${date}`)
			.then(async (response) => {
				const data = await response.json() as { error?: string; slots?: unknown };
				if (!response.ok) throw new Error(data.error ?? "Impossibile caricare gli orari disponibili.");
				if (!Array.isArray(data.slots)) throw new Error("Risposta non valida durante il caricamento degli orari.");
				if (active) setSlots(data.slots as Slot[]);
			})
			.catch((error: Error) => {
				if (!active) return;
				setSlots([]);
				toast.error(error.message);
			})
			.finally(() => {
				if (active) setSlotsLoading(false);
			});
		return () => { active = false; };
	}, [date, employeeId, serviceId]);

	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!name.trim()) {
			toast.error("Inserisci il tuo nome completo.");
			setNameError(true);
			if (nameErrorTimeout.current) clearTimeout(nameErrorTimeout.current);
			nameErrorTimeout.current = setTimeout(() => setNameError(false), 2000);
			return;
		}
		if (!phone.trim() && !email.trim()) {
			toast.error("Inserisci almeno telefono o email.");
			return;
		}
		setSaving(true);
		try {
			bookingRequestIdRef.current ??= window.crypto.randomUUID();
			const response = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": bookingRequestIdRef.current }, body: JSON.stringify({ serviceId, employeeId, date, time, name, phone, email }) });
			const result = await response.json() as { error?: string; price?: number | string | null; durationMinutes?: number | null; startTime?: string; endTime?: string };
			if (!response.ok) throw new Error(result.error ?? "Impossibile inviare la prenotazione.");
			if (!result.startTime || !result.endTime) throw new Error("Prenotazione salvata, ma il riepilogo non è disponibile. Contatta il salone prima di riprovare.");
			setConfirmation({
				serviceName: services.find((service) => service.id === serviceId)?.name ?? "Servizio",
				employeeName: employees.find((employee) => employee.id === employeeId)?.name ?? "Addetto",
				startTime: result.startTime,
				endTime: result.endTime,
				durationMinutes: result.durationMinutes ?? null,
				price: result.price ?? null,
				customerName: name.trim(),
				phone: phone.trim(),
				email: email.trim().toLowerCase(),
			});
		} catch (error) { toast.error(error instanceof Error ? error.message : "Impossibile inviare la prenotazione."); }
		finally { setSaving(false); }
	}

	function goToTimes() {
		if (!serviceId || !employeeId || !date) {
			toast.error("Seleziona servizio, operatore e giorno per continuare.");
			return;
		}
		changeStep(2);
	}

	function goToDetails() {
		if (!time) {
			toast.error("Seleziona un orario per continuare.");
			return;
		}
		changeStep(3);
	}

	function changeStep(nextStep: 1 | 2 | 3) {
		shouldScrollToStepRef.current = true;
		setStep(nextStep);
	}

	function scrollDates(direction: -1 | 1) {
		const scroller = datesScrollerRef.current;
		if (!scroller) return;
		scroller.scrollBy({ left: direction * Math.max(scroller.clientWidth - 16, 160), behavior: "smooth" });
	}

	function selectTime(nextTime: string) {
		setTime(nextTime);
		if (!window.matchMedia("(max-width: 767px)").matches) return;
		window.requestAnimationFrame(() => {
			const continueButton = continueToDetailsRef.current;
			if (!continueButton) return;
			const { bottom, top } = continueButton.getBoundingClientRect();
			const isVisible = top >= 0 && bottom <= window.innerHeight;
			if (!isVisible) continueButton.scrollIntoView({ behavior: "smooth", block: "center" });
			continueButton.focus({ preventScroll: true });
		});
	}

	if (confirmation) return <BookingConfirmationCard booking={confirmation} />;

	return <div className="min-h-[calc(100dvh-var(--navbar-height))] overflow-x-hidden bg-zinc-50 text-zinc-900"><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-16 md:py-8">
		{fromAccount ? <Link href="/account/bookings" className="mb-5 inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-zinc-700 underline underline-offset-4">← Torna alla mia area clienti</Link> : null}
		{loading ? <LoadingIndicator className="min-h-64" label="Caricamento disponibilità..." /> : <form ref={bookingFormRef} noValidate onSubmit={submit} className="scroll-mt-[calc(var(--navbar-height)+1rem)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-7">
			<div className="mb-6 grid grid-cols-3 gap-1.5 sm:mb-7 sm:gap-2" aria-label="Avanzamento prenotazione">
				{([1, 2, 3] as const).map((item) => <div key={item} className={`rounded-lg px-1.5 py-2 text-center text-[11px] font-semibold sm:px-2 sm:text-xs ${step === item ? "bg-zinc-900 text-white" : step > item ? "bg-zinc-200 text-zinc-800" : "bg-zinc-100 text-zinc-500"}`}>{item}. {item === 1 ? "Dettagli" : item === 2 ? "Orario" : "Contatti"}</div>)}
			</div>
			{step === 1 ? <div className="grid gap-6">
				<Field label="Per chi è il servizio?"><div className="flex flex-wrap gap-2">{(["tutti", "donna", "uomo"] as const).map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold capitalize ${category === item ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}>{item === "tutti" ? "Tutti" : item}</button>)}</div></Field>
				<div className="grid gap-4 sm:grid-cols-2"><Field label="Servizio"><Select value={serviceId} onValueChange={setServiceId}><SelectTrigger className="min-h-11"><SelectValue placeholder="Seleziona servizio" /></SelectTrigger><SelectContent>{filteredServices.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.duration ? ` · ${item.duration} min` : ""}</SelectItem>)}</SelectContent></Select>{filteredServices.length === 0 ? <p className="mt-2 text-xs text-zinc-500">Nessun servizio in questa categoria.</p> : null}</Field><Field label="Operatore"><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger className="min-h-11"><SelectValue placeholder="Seleziona operatore" /></SelectTrigger><SelectContent>{employees.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field></div>
				<Field label="Giorno" action={<div className="flex items-center gap-1"><button type="button" onClick={() => scrollDates(-1)} className="inline-flex size-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900" aria-label="Settimana precedente"><ChevronLeft className="size-4" /></button><button type="button" onClick={() => scrollDates(1)} className="inline-flex size-7 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900" aria-label="Settimana successiva"><ChevronRight className="size-4" /></button></div>}><div ref={datesScrollerRef} className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 lg:pb-0">{dates.map((item) => { const closed = isClosedDay(item, openingHours, closures); return <button key={item} type="button" disabled={closed} aria-pressed={date === item} aria-label={closed ? `${formatDate(item)}, chiuso` : formatDate(item)} onClick={() => setDate(item)} className={`min-h-12 min-w-24 shrink-0 snap-start rounded-xl border px-3 py-2 text-xs font-semibold capitalize sm:px-2 lg:min-w-[calc((100%-3rem)/7)] ${date === item ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"} ${closed ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-100" : ""}`}>{formatDate(item)}{closed ? <span className="mt-0.5 block text-[10px] normal-case">Chiuso</span> : null}</button>; })}</div></Field>
				<button type="button" onClick={goToTimes} className="min-h-12 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white">Continua</button>
			</div> : null}
			{step === 2 ? <div className="grid gap-6"><Field label="Orario">{slotsLoading ? <LoadingIndicator className="min-h-32 rounded-xl border border-zinc-200 bg-zinc-50" label="Caricamento orari disponibili..." /> : <><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">{slots.map((item) => <button key={item.time} type="button" disabled={item.disabled} aria-pressed={time === item.time} onClick={() => selectTime(item.time)} className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold ${time === item.time ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"} ${item.disabled ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 hover:bg-zinc-100" : ""}`}>{item.time}</button>)}</div>{slots.length === 0 && <p className="text-sm text-zinc-600">Nessun orario disponibile in questo giorno.</p>}</>}</Field><div className="flex gap-3"><button type="button" onClick={() => changeStep(1)} className="min-h-12 flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800">Indietro</button><button ref={continueToDetailsRef} type="button" onClick={goToDetails} className="min-h-12 flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white">Continua</button></div></div> : null}
			{step === 3 ? <div className="grid gap-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome e cognome"><input value={name} readOnly={accountLinked} aria-invalid={nameError} onChange={(event) => setName(event.target.value)} className={`input ${nameError ? "input-error" : ""}`} /></Field><Field label="Telefono"><input value={phone} readOnly={accountLinked} onChange={(event) => setPhone(event.target.value)} className="input" /></Field><Field label="Email"><input type="email" value={email} readOnly={accountLinked} onChange={(event) => setEmail(event.target.value)} className="input" /></Field></div><p className="text-xs leading-relaxed text-zinc-500">{accountLinked ? "Questa prenotazione sarà collegata al tuo account." : "Inserisci telefono o email per completare la prenotazione."}</p><div className="flex gap-3"><button type="button" onClick={() => changeStep(2)} className="min-h-12 flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800">Indietro</button><button disabled={saving} className="min-h-12 flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300">{saving ? "Invio..." : "Conferma"}</button></div></div> : null}
		</form>}
		<style jsx>{`.input { box-sizing:border-box; width:100%; max-width:100%; min-height:2.75rem; border:1px solid #DED9D2; border-radius:.75rem; padding:.6rem .75rem; font-size:1rem; color:#242827; background:#FFFEFC; } .input-error { border-color:#587983; background:color-mix(in srgb, #587983 10%, #F7F3ED); }`}</style>
	</main></div>;
}

function BookingPageFallback() {
	return <div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 text-zinc-900"><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-16"><LoadingIndicator className="min-h-64" label="Caricamento disponibilità..." /></main></div>;
}

function Field({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) { return <div className="min-w-0"><div className="mb-2 flex min-h-7 items-center justify-between gap-3"><label className="text-sm font-semibold text-zinc-800">{label}</label>{action}</div>{children}</div>; }
