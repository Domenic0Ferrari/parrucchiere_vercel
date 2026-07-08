"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

const ERROR_VISIBILITY_MS = 4000;

const WEEK_DAYS = [
	{ value: 1, label: "Lunedi" },
	{ value: 2, label: "Martedi" },
	{ value: 3, label: "Mercoledi" },
	{ value: 4, label: "Giovedi" },
	{ value: 5, label: "Venerdi" },
	{ value: 6, label: "Sabato" },
	{ value: 7, label: "Domenica" },
] as const;

type Salon = {
	id: string;
	name: string;
	email: string;
	phone: string;
	address: string;
};

type OpeningHour = {
	id?: string;
	salon_id?: string;
	day_of_week: number;
	is_open: boolean;
	morning_start: string;
	morning_end: string;
	afternoon_start: string;
	afternoon_end: string;
};

type Closure = {
	id: string;
	salon_id: string;
	closure_date: string;
	reason: string | null;
	all_day: boolean;
	start_time: string | null;
	end_time: string | null;
	created_at: string | null;
};

type ClosureForm = {
	start_date: string;
	end_date: string;
	reason: string;
	all_day: boolean;
	start_time: string;
	end_time: string;
};

type FieldErrors = Record<string, string>;

type SupabaseError = {
	message: string;
};

const emptySalon: Salon = {
	id: "",
	name: "",
	email: "",
	phone: "",
	address: "",
};

const emptyClosureForm: ClosureForm = {
	start_date: "",
	end_date: "",
	reason: "",
	all_day: true,
	start_time: "",
	end_time: "",
};

function defaultOpeningHours(salonId?: string): OpeningHour[] {
	return WEEK_DAYS.map((day) => ({
		salon_id: salonId,
		day_of_week: day.value,
		is_open: day.value <= 6,
		morning_start: day.value <= 6 ? "09:00" : "",
		morning_end: day.value <= 6 ? "13:00" : "",
		afternoon_start: day.value <= 6 ? "15:00" : "",
		afternoon_end: day.value <= 6 ? "19:00" : "",
	}));
}

function normalizeTime(value: string | null | undefined) {
	return typeof value === "string" ? value.slice(0, 5) : "";
}

function isValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isBefore(start: string, end: string) {
	return start !== "" && end !== "" && start < end;
}

function formatDate(value: string) {
	if (!value) return "";
	const [year, month, day] = value.split("-");
	return `${day}/${month}/${year}`;
}

function parseDateInput(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return null;

	const date = new Date(Date.UTC(year, month - 1, day));
	const isSameDate =
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day;

	return isSameDate ? date : null;
}

function formatDateInput(date: Date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getDatesInRange(startDate: string, endDate: string) {
	const start = parseDateInput(startDate);
	const end = parseDateInput(endDate);
	if (!start || !end || start > end) return [];

	const dates: string[] = [];
	const current = new Date(start);
	while (current <= end) {
		dates.push(formatDateInput(current));
		current.setUTCDate(current.getUTCDate() + 1);
	}
	return dates;
}

function buildSalonPayload(salon: Salon) {
	return {
		name: salon.name.trim(),
		email: salon.email.trim() || null,
		phone: salon.phone.trim() || null,
		address: salon.address.trim() || null,
		updated_at: new Date().toISOString(),
	};
}

function getErrorMessage(error: unknown) {
	return error && typeof error === "object" && "message" in error
		? String((error as SupabaseError).message)
		: "Errore imprevisto.";
}

export function SalonManagementPage() {
	const [salon, setSalon] = useState<Salon>(emptySalon);
	const [openingHours, setOpeningHours] = useState<OpeningHour[]>(defaultOpeningHours());
	const [closures, setClosures] = useState<Closure[]>([]);
	const [closureForm, setClosureForm] = useState<ClosureForm>(emptyClosureForm);
	const [loading, setLoading] = useState(true);
	const [savingSalon, setSavingSalon] = useState(false);
	const [savingHours, setSavingHours] = useState(false);
	const [savingClosure, setSavingClosure] = useState(false);
	const [deletingClosureId, setDeletingClosureId] = useState<string | null>(null);
	const [salonErrors, setSalonErrors] = useState<FieldErrors>({});
	const [hoursErrors, setHoursErrors] = useState<FieldErrors>({});
	const [closureErrors, setClosureErrors] = useState<FieldErrors>({});

	const supabase = useMemo(() => getSupabaseBrowserClient(), []);

	const loadClosures = useCallback(
		async (salonId: string) => {
			const { data, error } = await supabase
				.from("salon_closures")
				.select("id, salon_id, closure_date, reason, all_day, start_time, end_time, created_at")
				.eq("salon_id", salonId)
				.order("closure_date", { ascending: true });

			if (error) throw error;
			setClosures(
				(data ?? []).map((row) => ({
					id: String(row.id),
					salon_id: String(row.salon_id),
					closure_date: String(row.closure_date),
					reason: row.reason ? String(row.reason) : null,
					all_day: Boolean(row.all_day),
					start_time: normalizeTime(row.start_time),
					end_time: normalizeTime(row.end_time),
					created_at: row.created_at ? String(row.created_at) : null,
				}))
			);
		},
		[supabase]
	);

	const loadOpeningHours = useCallback(
		async (salonId: string) => {
			const { data, error } = await supabase
				.from("salon_opening_hours")
				.select("id, salon_id, day_of_week, is_open, morning_start, morning_end, afternoon_start, afternoon_end")
				.eq("salon_id", salonId)
				.order("day_of_week", { ascending: true });

			if (error) throw error;

			if (!data || data.length === 0) {
				const initialHours = defaultOpeningHours(salonId);
				const { data: inserted, error: insertError } = await supabase
					.from("salon_opening_hours")
					.upsert(initialHours, { onConflict: "salon_id,day_of_week" })
					.select("id, salon_id, day_of_week, is_open, morning_start, morning_end, afternoon_start, afternoon_end");

				if (insertError) throw insertError;
				setOpeningHours(normalizeOpeningHours(inserted ?? initialHours, salonId));
				return;
			}

			setOpeningHours(normalizeOpeningHours(data, salonId));
		},
		[supabase]
	);

	useEffect(() => {
		let ignore = false;

		async function loadSalon() {
			try {
				setLoading(true);
				const { data, error } = await supabase
					.from("salon")
					.select("id, name, email, phone, address")
					.order("created_at", { ascending: true })
					.limit(1)
					.maybeSingle();

				if (error) throw error;
				if (ignore) return;

				if (!data) {
					setSalon(emptySalon);
					setOpeningHours(defaultOpeningHours());
					setClosures([]);
					return;
				}

				const loadedSalon = {
					id: String(data.id),
					name: data.name ? String(data.name) : "",
					email: data.email ? String(data.email) : "",
					phone: data.phone ? String(data.phone) : "",
					address: data.address ? String(data.address) : "",
				};
				setSalon(loadedSalon);
				await Promise.all([loadOpeningHours(loadedSalon.id), loadClosures(loadedSalon.id)]);
			} catch (error) {
				toast.error(getErrorMessage(error), { duration: ERROR_VISIBILITY_MS });
			} finally {
				if (!ignore) setLoading(false);
			}
		}

		void loadSalon();
		return () => {
			ignore = true;
		};
	}, [loadClosures, loadOpeningHours, supabase]);

	function validateSalon(currentSalon: Salon) {
		const nextErrors: FieldErrors = {};
		if (!currentSalon.name.trim()) nextErrors.name = "Inserisci il nome del salone.";
		if (currentSalon.email.trim() && !isValidEmail(currentSalon.email.trim())) {
			nextErrors.email = "Inserisci un indirizzo email valido.";
		}
		return nextErrors;
	}

	async function ensureSalonRecord() {
		const nextErrors = validateSalon(salon);
		setSalonErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return null;

		const payload = buildSalonPayload(salon);
		if (salon.id) {
			const { data, error } = await supabase
				.from("salon")
				.update(payload)
				.eq("id", salon.id)
				.select("id, name, email, phone, address")
				.single();
			if (error) throw error;
			const updatedSalon = normalizeSalon(data);
			setSalon(updatedSalon);
			return updatedSalon.id;
		}

		const { data, error } = await supabase
			.from("salon")
			.insert(payload)
			.select("id, name, email, phone, address")
			.single();

		if (error) throw error;
		const createdSalon = normalizeSalon(data);
		const initialHours = defaultOpeningHours(createdSalon.id);
		const { error: hoursError } = await supabase
			.from("salon_opening_hours")
			.upsert(initialHours, { onConflict: "salon_id,day_of_week" });
		if (hoursError) throw hoursError;
		setSalon(createdSalon);
		setOpeningHours((current) => current.map((hour) => ({ ...hour, salon_id: createdSalon.id })));
		return createdSalon.id;
	}

	async function handleSaveSalon(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (savingSalon) return;
		setSavingSalon(true);

		try {
			const salonId = await ensureSalonRecord();
			if (!salonId) return;
			toast.success("Dati salone salvati correttamente.");
		} catch (error) {
			toast.error(getErrorMessage(error), { duration: ERROR_VISIBILITY_MS });
		} finally {
			setSavingSalon(false);
		}
	}

	function validateOpeningHours(hours: OpeningHour[]) {
		const nextErrors: FieldErrors = {};

		for (const hour of hours) {
			if (!hour.is_open) continue;

			const dayName = WEEK_DAYS.find((day) => day.value === hour.day_of_week)?.label ?? "Giorno";
			const hasMorningValues = hour.morning_start || hour.morning_end;
			const hasAfternoonValues = hour.afternoon_start || hour.afternoon_end;
			const validMorning = isBefore(hour.morning_start, hour.morning_end);
			const validAfternoon = isBefore(hour.afternoon_start, hour.afternoon_end);

			if (hasMorningValues && !validMorning) {
				nextErrors[`morning-${hour.day_of_week}`] = `${dayName}: fascia mattina non valida.`;
			}
			if (hasAfternoonValues && !validAfternoon) {
				nextErrors[`afternoon-${hour.day_of_week}`] = `${dayName}: fascia pomeriggio non valida.`;
			}
			if (!validMorning && !validAfternoon) {
				nextErrors[`day-${hour.day_of_week}`] = `${dayName}: inserisci almeno una fascia oraria valida.`;
			}
		}

		return nextErrors;
	}

	async function handleSaveOpeningHours() {
		if (savingHours) return;
		const nextErrors = validateOpeningHours(openingHours);
		setHoursErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setSavingHours(true);
		try {
			const salonId = await ensureSalonRecord();
			if (!salonId) return;

			const rows = openingHours.map((hour) => ({
				salon_id: salonId,
				day_of_week: hour.day_of_week,
				is_open: hour.is_open,
				morning_start: hour.is_open && hour.morning_start ? hour.morning_start : null,
				morning_end: hour.is_open && hour.morning_end ? hour.morning_end : null,
				afternoon_start: hour.is_open && hour.afternoon_start ? hour.afternoon_start : null,
				afternoon_end: hour.is_open && hour.afternoon_end ? hour.afternoon_end : null,
				updated_at: new Date().toISOString(),
			}));

			const { data, error } = await supabase
				.from("salon_opening_hours")
				.upsert(rows, { onConflict: "salon_id,day_of_week" })
				.select("id, salon_id, day_of_week, is_open, morning_start, morning_end, afternoon_start, afternoon_end");

			if (error) throw error;
			setOpeningHours(normalizeOpeningHours(data ?? rows, salonId));
			toast.success("Orari di apertura salvati correttamente.");
		} catch (error) {
			toast.error(getErrorMessage(error), { duration: ERROR_VISIBILITY_MS });
		} finally {
			setSavingHours(false);
		}
	}

	function validateClosureForm(form: ClosureForm) {
		const nextErrors: FieldErrors = {};
		if (!form.start_date) nextErrors.start_date = "Seleziona la data di inizio.";
		if (!form.end_date) nextErrors.end_date = "Seleziona la data di fine.";
		if (form.start_date && form.end_date && form.end_date < form.start_date) {
			nextErrors.end_date = "La data di fine deve essere successiva o uguale all'inizio.";
		}
		if (!form.all_day) {
			if (!form.start_time) nextErrors.start_time = "Inserisci l'orario di inizio.";
			if (!form.end_time) nextErrors.end_time = "Inserisci l'orario di fine.";
			if (form.start_time && form.end_time && !isBefore(form.start_time, form.end_time)) {
				nextErrors.end_time = "L'orario di fine deve essere successivo all'inizio.";
			}
		}
		return nextErrors;
	}

	async function handleAddClosure(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (savingClosure) return;

		const nextErrors = validateClosureForm(closureForm);
		setClosureErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setSavingClosure(true);
		try {
			const salonId = await ensureSalonRecord();
			if (!salonId) return;

			const closureDates = getDatesInRange(closureForm.start_date, closureForm.end_date);
			const { data, error } = await supabase
				.from("salon_closures")
				.insert(
					closureDates.map((closureDate) => ({
						salon_id: salonId,
						closure_date: closureDate,
						reason: closureForm.reason.trim() || null,
						all_day: closureForm.all_day,
						start_time: closureForm.all_day ? null : closureForm.start_time,
						end_time: closureForm.all_day ? null : closureForm.end_time,
					}))
				)
				.select("id, salon_id, closure_date, reason, all_day, start_time, end_time, created_at");

			if (error) throw error;
			setClosures((current) =>
				[...current, ...(data ?? []).map(normalizeClosure)].sort((a, b) =>
					a.closure_date.localeCompare(b.closure_date)
				)
			);
			setClosureForm(emptyClosureForm);
			setClosureErrors({});
			toast.success(
				closureDates.length === 1
					? "Chiusura extra aggiunta correttamente."
					: "Chiusure extra aggiunte correttamente."
			);
		} catch (error) {
			toast.error(getErrorMessage(error), { duration: ERROR_VISIBILITY_MS });
		} finally {
			setSavingClosure(false);
		}
	}

	async function handleDeleteClosure() {
		if (!deletingClosureId) return;

		try {
			const { error } = await supabase
				.from("salon_closures")
				.delete()
				.eq("id", deletingClosureId);
			if (error) throw error;
			setClosures((current) => current.filter((closure) => closure.id !== deletingClosureId));
			setDeletingClosureId(null);
			toast.success("Chiusura extra eliminata.");
		} catch (error) {
			toast.error(getErrorMessage(error), { duration: ERROR_VISIBILITY_MS });
		}
	}

	function updateOpeningHour(dayOfWeek: number, patch: Partial<OpeningHour>) {
		setOpeningHours((current) =>
			current.map((hour) =>
				hour.day_of_week === dayOfWeek
					? {
							...hour,
							...patch,
						}
					: hour
			)
		);
		setHoursErrors({});
	}

	if (loading) {
		return (
			<section className="space-y-6">
				<PageHeader />
				<Card>
					<CardContent className="flex min-h-64 items-center justify-center pt-6">
						<p className="text-sm text-zinc-600">Caricamento dati salone...</p>
					</CardContent>
				</Card>
			</section>
		);
	}

	return (
		<section className="space-y-6">
			<PageHeader />

			<Card>
				<CardHeader>
					<CardTitle>Dati salone</CardTitle>
					<CardDescription>Modifica le informazioni pubbliche e di contatto.</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={handleSaveSalon}>
						<div className="grid gap-4 md:grid-cols-2">
							<Field id="salon-name" label="Nome salone" error={salonErrors.name}>
								<Input
									id="salon-name"
									value={salon.name}
									onChange={(event) => {
										setSalon((current) => ({ ...current, name: event.target.value }));
										setSalonErrors((current) => ({ ...current, name: "" }));
									}}
								/>
							</Field>
							<Field id="salon-email" label="Email" error={salonErrors.email}>
								<Input
									id="salon-email"
									type="email"
									value={salon.email}
									onChange={(event) => {
										setSalon((current) => ({ ...current, email: event.target.value }));
										setSalonErrors((current) => ({ ...current, email: "" }));
									}}
								/>
							</Field>
							<Field id="salon-phone" label="Telefono">
								<Input
									id="salon-phone"
									value={salon.phone}
									onChange={(event) =>
										setSalon((current) => ({ ...current, phone: event.target.value }))
									}
								/>
							</Field>
							<Field id="salon-address" label="Indirizzo">
								<Input
									id="salon-address"
									value={salon.address}
									onChange={(event) =>
										setSalon((current) => ({ ...current, address: event.target.value }))
									}
								/>
							</Field>
						</div>
						<div className="flex justify-end">
							<Button type="submit" className="gap-2" disabled={savingSalon}>
								<Save className="h-4 w-4" />
								{savingSalon ? "Salvataggio..." : "Salva dati"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
					<div>
						<CardTitle>Orari di apertura</CardTitle>
						<CardDescription>Configura le fasce settimanali del salone.</CardDescription>
					</div>
					<Button type="button" className="gap-2" disabled={savingHours} onClick={handleSaveOpeningHours}>
						<Save className="h-4 w-4" />
						{savingHours ? "Salvataggio..." : "Salva orari"}
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						{openingHours.map((hour) => {
							const day = WEEK_DAYS.find((item) => item.value === hour.day_of_week);
							const disabled = !hour.is_open;

							return (
								<div
									key={hour.day_of_week}
									className="grid gap-4 rounded-lg border border-zinc-200 p-4 lg:grid-cols-[9rem_1fr_1fr]"
								>
									<div className="flex items-center justify-between gap-3 lg:block">
										<p className="font-semibold text-zinc-900">{day?.label}</p>
										<div className="mt-0 flex items-center gap-2 lg:mt-3">
											<Switch
												checked={hour.is_open}
												onCheckedChange={(checked) =>
													updateOpeningHour(hour.day_of_week, { is_open: checked })
												}
												aria-label={`${day?.label} aperto`}
											/>
											<span className="text-sm text-zinc-600">
												{hour.is_open ? "Aperto" : "Chiuso"}
											</span>
										</div>
									</div>

									<TimeRange
										label="Mattina"
										startId={`morning-start-${hour.day_of_week}`}
										endId={`morning-end-${hour.day_of_week}`}
										start={hour.morning_start}
										end={hour.morning_end}
										disabled={disabled}
										onStartChange={(value) =>
											updateOpeningHour(hour.day_of_week, { morning_start: value })
										}
										onEndChange={(value) =>
											updateOpeningHour(hour.day_of_week, { morning_end: value })
										}
									/>
									<TimeRange
										label="Pomeriggio"
										startId={`afternoon-start-${hour.day_of_week}`}
										endId={`afternoon-end-${hour.day_of_week}`}
										start={hour.afternoon_start}
										end={hour.afternoon_end}
										disabled={disabled}
										onStartChange={(value) =>
											updateOpeningHour(hour.day_of_week, { afternoon_start: value })
										}
										onEndChange={(value) =>
											updateOpeningHour(hour.day_of_week, { afternoon_end: value })
										}
									/>
									{Object.entries(hoursErrors)
										.filter(([key]) => key.endsWith(`-${hour.day_of_week}`))
										.map(([key, message]) => (
											<p key={key} className="text-sm text-red-600 lg:col-span-3">
												{message}
											</p>
										))}
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Chiusure extra</CardTitle>
					<CardDescription>Registra ferie, festivita o chiusure parziali.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-6 xl:grid-cols-[1fr_24rem]">
					<div className="space-y-3">
						{closures.length === 0 ? (
							<div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center">
								<CalendarOff className="mx-auto h-7 w-7 text-zinc-400" />
								<p className="mt-2 text-sm text-zinc-600">Nessuna chiusura extra inserita.</p>
							</div>
						) : (
							closures.map((closure) => (
								<div
									key={closure.id}
									className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4"
								>
									<div>
										<p className="font-semibold text-zinc-900">{formatDate(closure.closure_date)}</p>
										<p className="mt-1 text-sm text-zinc-600">
											{closure.all_day
												? "Tutto il giorno"
												: `${closure.start_time} - ${closure.end_time}`}
											{closure.reason ? ` · ${closure.reason}` : ""}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="icon"
										aria-label="Elimina chiusura"
										className="text-red-700 hover:bg-red-50"
										onClick={() => setDeletingClosureId(closure.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))
						)}
					</div>

					<form className="space-y-4 rounded-lg border border-zinc-200 p-4" onSubmit={handleAddClosure}>
						<div>
							<h3 className="text-base font-semibold text-zinc-900">Nuova chiusura</h3>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<Field id="closure-start-date" label="Da" error={closureErrors.start_date}>
								<Input
									id="closure-start-date"
									type="date"
									value={closureForm.start_date}
									onChange={(event) =>
										setClosureForm((current) => ({
											...current,
											start_date: event.target.value,
											end_date: current.end_date || event.target.value,
										}))
									}
								/>
							</Field>
							<Field id="closure-end-date" label="A" error={closureErrors.end_date}>
								<Input
									id="closure-end-date"
									type="date"
									value={closureForm.end_date}
									min={closureForm.start_date || undefined}
									onChange={(event) =>
										setClosureForm((current) => ({
											...current,
											end_date: event.target.value,
										}))
									}
								/>
							</Field>
						</div>
						<Field id="closure-reason" label="Motivo">
							<Input
								id="closure-reason"
								value={closureForm.reason}
								onChange={(event) =>
									setClosureForm((current) => ({ ...current, reason: event.target.value }))
								}
							/>
						</Field>
						<div className="flex items-center gap-3">
							<Checkbox
								checked={closureForm.all_day}
								onCheckedChange={(checked) =>
									setClosureForm((current) => ({ ...current, all_day: checked }))
								}
								aria-label="Tutto il giorno"
							/>
							<Label>Tutto il giorno</Label>
						</div>
						<div
							className={cn(
								"grid gap-3 sm:grid-cols-2",
								closureForm.all_day && "hidden"
							)}
						>
							<Field id="closure-start" label="Inizio" error={closureErrors.start_time}>
								<Input
									id="closure-start"
									type="time"
									value={closureForm.start_time}
									disabled={closureForm.all_day}
									onChange={(event) =>
										setClosureForm((current) => ({
											...current,
											start_time: event.target.value,
										}))
									}
								/>
							</Field>
							<Field id="closure-end" label="Fine" error={closureErrors.end_time}>
								<Input
									id="closure-end"
									type="time"
									value={closureForm.end_time}
									disabled={closureForm.all_day}
									onChange={(event) =>
										setClosureForm((current) => ({ ...current, end_time: event.target.value }))
									}
								/>
							</Field>
						</div>
						<Button type="submit" className="w-full gap-2" disabled={savingClosure}>
							<Plus className="h-4 w-4" />
							{savingClosure ? "Salvataggio..." : "Aggiungi chiusura"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<ConfirmDialog
				open={deletingClosureId !== null}
				title="Eliminare questa chiusura?"
				description="La chiusura extra verra rimossa dal calendario del salone."
				confirmLabel="Elimina"
				confirmVariant="destructive"
				isLoading={false}
				onCancel={() => setDeletingClosureId(null)}
				onConfirm={() => void handleDeleteClosure()}
			/>
		</section>
	);
}

function normalizeSalon(row: Record<string, unknown>): Salon {
	return {
		id: String(row.id),
		name: row.name ? String(row.name) : "",
		email: row.email ? String(row.email) : "",
		phone: row.phone ? String(row.phone) : "",
		address: row.address ? String(row.address) : "",
	};
}

function normalizeOpeningHours(rows: Record<string, unknown>[], salonId: string): OpeningHour[] {
	const byDay = new Map<number, Record<string, unknown>>();
	for (const row of rows) {
		byDay.set(Number(row.day_of_week), row);
	}

	return defaultOpeningHours(salonId).map((fallback) => {
		const row = byDay.get(fallback.day_of_week);
		if (!row) return fallback;

		return {
			id: row.id ? String(row.id) : undefined,
			salon_id: salonId,
			day_of_week: Number(row.day_of_week),
			is_open: Boolean(row.is_open),
			morning_start: normalizeTime(row.morning_start as string | null),
			morning_end: normalizeTime(row.morning_end as string | null),
			afternoon_start: normalizeTime(row.afternoon_start as string | null),
			afternoon_end: normalizeTime(row.afternoon_end as string | null),
		};
	});
}

function normalizeClosure(row: Record<string, unknown>): Closure {
	return {
		id: String(row.id),
		salon_id: String(row.salon_id),
		closure_date: String(row.closure_date),
		reason: row.reason ? String(row.reason) : null,
		all_day: Boolean(row.all_day),
		start_time: normalizeTime(row.start_time as string | null) || null,
		end_time: normalizeTime(row.end_time as string | null) || null,
		created_at: row.created_at ? String(row.created_at) : null,
	};
}

function PageHeader() {
	return (
		<header>
			<h1 className="text-2xl font-semibold text-zinc-900">Salone</h1>
			<p className="mt-1 text-sm text-zinc-600">
				Gestisci informazioni, orari settimanali e chiusure extra.
			</p>
		</header>
	);
}

function Field({
	id,
	label,
	error,
	children,
}: {
	id: string;
	label: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			{children}
			{error ? <p className="text-sm text-red-600">{error}</p> : null}
		</div>
	);
}

function TimeRange({
	label,
	startId,
	endId,
	start,
	end,
	disabled,
	onStartChange,
	onEndChange,
}: {
	label: string;
	startId: string;
	endId: string;
	start: string;
	end: string;
	disabled: boolean;
	onStartChange: (value: string) => void;
	onEndChange: (value: string) => void;
}) {
	return (
		<div>
			<p className="mb-2 text-sm font-semibold text-zinc-900">{label}</p>
			<div className="grid grid-cols-2 gap-3">
				<Field id={startId} label="Inizio">
					<Input
						id={startId}
						type="time"
						value={start}
						disabled={disabled}
						onChange={(event) => onStartChange(event.target.value)}
					/>
				</Field>
				<Field id={endId} label="Fine">
					<Input
						id={endId}
						type="time"
						value={end}
						disabled={disabled}
						onChange={(event) => onEndChange(event.target.value)}
					/>
				</Field>
			</div>
		</div>
	);
}
