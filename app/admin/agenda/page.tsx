"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { createDayView, createMonthView, createWeekView, DayFlowCalendar, useCalendarApp, ViewType } from "@dayflow/react";
import "@dayflow/core/dist/styles.components.css";
import { CalendarDays, CalendarPlus2, ChevronLeft, ChevronRight, Clock3, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuthSession } from "@/components/auth/employee-session-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

type EmployeeOption = {
	id: string;
	name: string;
	role: string | null;
	isActive: boolean;
};

type CustomerOption = {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	note: string | null;
};

type ServiceOption = {
	id: string;
	name: string;
	price: number | null;
	durationMinutes: number | null;
};

type AppointmentRow = {
	id: string;
	customer_id: string;
	service_id: string;
	employee_id: string;
	customer_name: string;
	service_name: string;
	operator_name: string | null;
	start_at: string;
	end_at: string;
	notes: string | null;
	status: string | null;
};

type RawRow = Record<string, unknown>;
type NewCustomerFieldErrors = {
	name?: boolean;
	phone?: boolean;
	email?: boolean;
};
type CreateFieldErrors = NewCustomerFieldErrors & {
	customer?: boolean;
	service?: boolean;
	startAt?: boolean;
};
type DuplicateAppointmentWarning = {
	customerName: string;
};
type CalendarContextMenu = {
	x: number;
	y: number;
	appointmentId?: string;
};

const TIME_ZONE = "Europe/Rome";
const AGENDA_START_HOUR = 8;
const AGENDA_END_HOUR = 20;
const CALENDAR_FIRST_HOUR = 0;
const CALENDAR_LAST_HOUR = 24;
const CALENDAR_HOUR_HEIGHT = 64;
const CALENDAR_HOURS_COUNT = CALENDAR_LAST_HOUR - CALENDAR_FIRST_HOUR;
const CURRENT_TIME_TOP_MARGIN_HOURS = 1.5;
const NEW_CUSTOMER_VALUE = "__new_customer__";
const ACTIVE_APPOINTMENT_STATUS = "scheduled";
const ERROR_VISIBILITY_MS = 4000;
const FIELD_ERROR_VISIBILITY_MS = 2000;
const EMPTY_DATE_TIME_LABEL = "--/--/---- --:--";

function formatCalendarHeading(value: string, view: string) {
	const date = Temporal.PlainDate.from(value);
	const formatter = new Intl.DateTimeFormat("it-IT", {
		month: "long",
		year: "numeric",
		...(view === ViewType.DAY ? { weekday: "long", day: "numeric" } : {}),
	});
	return formatter.format(new Date(`${date.toString()}T12:00:00`));
}

function toNullableNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function normalizeEmployee(row: RawRow): EmployeeOption {
	return {
		id: String(row.id ?? ""),
		name: String(row.name ?? "Addetto"),
		role: typeof row.role === "string" ? row.role : null,
		isActive: row.is_active === true || row.is_active === "true" || row.is_active === 1,
	};
}

function normalizeCustomer(row: RawRow): CustomerOption {
	return {
		id: String(row.id ?? ""),
		name: String(row.name ?? "Cliente"),
		phone: typeof row.phone === "string" && row.phone.trim() !== "" ? row.phone : null,
		email: typeof row.email === "string" && row.email.trim() !== "" ? row.email : null,
		note: typeof row.note === "string" && row.note.trim() !== "" ? row.note : null,
	};
}

function normalizeService(row: RawRow): ServiceOption {
	return {
		id: String(row.id ?? ""),
		name: String(row.name ?? row.service_name ?? "Servizio"),
		price: toNullableNumber(row.price ?? row.prezzo ?? row.amount),
		durationMinutes: toNullableNumber(row.duration_minutes ?? row.duration ?? row.durata ?? row.minutes ?? row.minuti),
	};
}

function normalizeAppointment(
	row: RawRow,
	customersById: Map<string, CustomerOption>,
	servicesById: Map<string, ServiceOption>,
	employeesById: Map<string, EmployeeOption>
): AppointmentRow {
	const customerId = String(row.customer_id ?? "");
	const serviceId = String(row.service_id ?? "");
	const employeeId = String(row.employee_id ?? "");
	const customer = customersById.get(customerId);
	const service = servicesById.get(serviceId);
	const employee = employeesById.get(employeeId);

	return {
		id: String(row.id ?? ""),
		customer_id: customerId,
		service_id: serviceId,
		employee_id: employeeId,
		customer_name: customer?.name ?? "Cliente",
		service_name: service?.name ?? "Servizio",
		operator_name: employee?.name ?? null,
		start_at: String(row.start_time ?? ""),
		end_at: String(row.end_time ?? ""),
		notes: typeof row.staff_note === "string" && row.staff_note.trim() !== "" ? row.staff_note : null,
		status: typeof row.status === "string" ? row.status : null,
	};
}

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

function getInputDatePart(value: string) {
	return value.split("T")[0] ?? "";
}

function updateInputDateTime(
	value: string,
	partial: { date?: string; time?: string }
) {
	const date = partial.date ?? getInputDatePart(value);
	const time = partial.time ?? value.split("T")[1] ?? `${String(AGENDA_START_HOUR).padStart(2, "0")}:00`;

	if (!date) return "";
	return `${date}T${time}`;
}

function addMinutesToInputDateTime(value: string, minutes: number | null) {
	if (!value || !minutes || minutes <= 0) return "";
	return Temporal.PlainDateTime.from(value)
		.add({ minutes })
		.toString({ smallestUnit: "minute" });
}

function getDefaultStartDateTime() {
	return `${Temporal.Now.plainDateISO(TIME_ZONE).toString()}T${String(AGENDA_START_HOUR).padStart(2, "0")}:00`;
}

function toHourMinute(value: string) {
	return toZonedDateTime(value).toPlainTime().toString({ smallestUnit: "minute" });
}

function toSupabaseTimestamp(value: string) {
	return Temporal.PlainDateTime.from(value).toZonedDateTime(TIME_ZONE).toInstant().toString();
}

function getDurationMinutes(startValue: string, endValue: string) {
	const start = Temporal.PlainDateTime.from(startValue);
	const end = Temporal.PlainDateTime.from(endValue);
	return Math.round(start.until(end).total({ unit: "minutes" }));
}

function compareDateTimes(left: string, right: string) {
	return Temporal.PlainDateTime.compare(
		Temporal.PlainDateTime.from(left),
		Temporal.PlainDateTime.from(right)
	);
}

function appointmentToPlainDateTimes(item: AppointmentRow) {
	return {
		start: toInputDateTime(item.start_at),
		end: toInputDateTime(item.end_at),
	};
}

function hasAppointmentOverlap({
	appointments,
	employeeId,
	startAt,
	endAt,
	excludeAppointmentId,
}: {
	appointments: AppointmentRow[];
	employeeId: string;
	startAt: string;
	endAt: string;
	excludeAppointmentId?: string | null;
}) {
	return appointments.some((item) => {
		if (item.employee_id !== employeeId) return false;
		if (item.status !== ACTIVE_APPOINTMENT_STATUS) return false;
		if (excludeAppointmentId && item.id === excludeAppointmentId) return false;

		const existing = appointmentToPlainDateTimes(item);
		return compareDateTimes(startAt, existing.end) < 0
			&& compareDateTimes(endAt, existing.start) > 0;
	});
}

function buildTimeSlots({
	date,
	durationMinutes,
	employeeId,
	appointments,
	excludeAppointmentId,
}: {
	date: string;
	durationMinutes: number | null;
	employeeId: string;
	appointments: AppointmentRow[];
	excludeAppointmentId?: string | null;
}) {
	if (!date) return [];

	const dayStart = Temporal.PlainDateTime.from(`${date}T${String(AGENDA_START_HOUR).padStart(2, "0")}:00`);
	const dayEnd = Temporal.PlainDateTime.from(`${date}T${String(AGENDA_END_HOUR).padStart(2, "0")}:00`);
	const slots: Array<{ value: string; label: string; disabled: boolean }> = [];

	for (
		let cursor = dayStart;
		Temporal.PlainDateTime.compare(cursor, dayEnd) <= 0;
		cursor = cursor.add({ minutes: 15 })
	) {
		const startAt = cursor.toString({ smallestUnit: "minute" });
		const endAt = durationMinutes && durationMinutes > 0
			? cursor.add({ minutes: durationMinutes }).toString({ smallestUnit: "minute" })
			: "";
		const label = cursor.toPlainTime().toString({ smallestUnit: "minute" });
		const endsAfterAgenda = !endAt || compareDateTimes(endAt, dayEnd.toString({ smallestUnit: "minute" })) > 0;
		const overlaps = !endsAfterAgenda && hasAppointmentOverlap({
			appointments,
			employeeId,
			startAt,
			endAt,
			excludeAppointmentId,
		});

		slots.push({
			value: label,
			label,
			disabled: !durationMinutes || durationMinutes <= 0 || endsAfterAgenda || overlaps,
		});
	}

	return slots;
}

function isWithinAgendaHours(start: Temporal.PlainDateTime, end: Temporal.PlainDateTime) {
	const agendaStart = Temporal.PlainTime.from({ hour: AGENDA_START_HOUR });
	const agendaEnd = Temporal.PlainTime.from({ hour: AGENDA_END_HOUR });
	return Temporal.PlainTime.compare(start.toPlainTime(), agendaStart) >= 0
		&& Temporal.PlainTime.compare(end.toPlainTime(), agendaEnd) <= 0;
}

function validateTimes(startAt: string, endAt: string) {
	if (!getInputDatePart(startAt)) {
		return "Inserisci la data di inizio appuntamento.";
	}
	if (!startAt || !endAt) {
		return "Seleziona data e ora di inizio e fine appuntamento.";
	}

	const start = Temporal.PlainDateTime.from(startAt);
	const end = Temporal.PlainDateTime.from(endAt);
	if (Temporal.PlainDateTime.compare(end, start) <= 0) {
		return "L'orario di fine deve essere successivo all'orario di inizio.";
	}
	if (!isWithinAgendaHours(start, end)) {
		return `Gli appuntamenti devono essere compresi tra le ${String(AGENDA_START_HOUR).padStart(2, "0")}:00 e le ${String(AGENDA_END_HOUR).padStart(2, "0")}:00.`;
	}
	return null;
}

async function fetchAppointmentsForEmployee(
	employeeId: string,
	maps: {
		customersById: Map<string, CustomerOption>;
		servicesById: Map<string, ServiceOption>;
		employeesById: Map<string, EmployeeOption>;
	}
) {
	const supabase = getSupabaseBrowserClient();
	const { data, error } = await supabase
		.from("appointments")
		.select("id, customer_id, employee_id, service_id, start_time, end_time, status, final_price, final_duration_minutes, client_note, staff_note, appointment_source, created_at, updated_at")
		.eq("employee_id", employeeId)
		.eq("status", ACTIVE_APPOINTMENT_STATUS)
		.order("start_time", { ascending: true });

	if (error) throw error;

	return ((data ?? []) as RawRow[])
		.map((row) => normalizeAppointment(row, maps.customersById, maps.servicesById, maps.employeesById))
		.filter((item) => item.id && item.start_at && item.end_at);
}

async function assertSlotAvailable({
	employeeId,
	startAt,
	endAt,
	excludeAppointmentId,
}: {
	employeeId: string;
	startAt: string;
	endAt: string;
	excludeAppointmentId?: string | null;
}) {
	const supabase = getSupabaseBrowserClient();
	const { data, error } = await supabase
		.from("appointments")
		.select("id, employee_id, start_time, end_time, status")
		.eq("employee_id", employeeId)
		.eq("status", ACTIVE_APPOINTMENT_STATUS);

	if (error) throw error;

	const overlaps = ((data ?? []) as RawRow[]).some((row) => {
		const id = String(row.id ?? "");
		if (excludeAppointmentId && id === excludeAppointmentId) return false;

		const existingStart = toInputDateTime(String(row.start_time ?? ""));
		const existingEnd = toInputDateTime(String(row.end_time ?? ""));
		return compareDateTimes(startAt, existingEnd) < 0
			&& compareDateTimes(endAt, existingStart) > 0;
	});

	if (overlaps) {
		throw new Error("Orario non più disponibile");
	}
}

export default function AdminAgendaPage() {
	const { user } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";
	const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
	const [employees, setEmployees] = useState<EmployeeOption[]>([]);
	const [customers, setCustomers] = useState<CustomerOption[]>([]);
	const [services, setServices] = useState<ServiceOption[]>([]);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
	const [loading, setLoading] = useState(true);
	const [appointmentsLoading, setAppointmentsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [newCustomerName, setNewCustomerName] = useState("");
	const [newCustomerPhone, setNewCustomerPhone] = useState("");
	const [newCustomerEmail, setNewCustomerEmail] = useState("");
	const [newCustomerNote, setNewCustomerNote] = useState("");
	const [createFieldErrors, setCreateFieldErrors] = useState<CreateFieldErrors>({});
	const [selectedServiceId, setSelectedServiceId] = useState("");
	const [startAt, setStartAt] = useState(getDefaultStartDateTime);
	const [endAt, setEndAt] = useState("");
	const [notes, setNotes] = useState("");
	const [duplicateAppointmentWarning, setDuplicateAppointmentWarning] = useState<DuplicateAppointmentWarning | null>(null);
	const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false);
	const [calendarContextMenu, setCalendarContextMenu] = useState<CalendarContextMenu | null>(null);
	const longPressTimer = useRef<number | null>(null);

	const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
	const [editCustomerId, setEditCustomerId] = useState("");
	const [editServiceId, setEditServiceId] = useState("");
	const [editEmployeeId, setEditEmployeeId] = useState("");
	const [editStartAt, setEditStartAt] = useState("");
	const [editEndAt, setEditEndAt] = useState("");
	const [editNotes, setEditNotes] = useState("");
	const [calendarView, setCalendarView] = useState<string>(ViewType.DAY);
	const [calendarDate, setCalendarDate] = useState(() => Temporal.Now.plainDateISO().toString());

	const employeesById = useMemo(() => new Map(employees.map((item) => [item.id, item])), [employees]);
	const customersById = useMemo(() => new Map(customers.map((item) => [item.id, item])), [customers]);
	const servicesById = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
	const selectedAppointment = useMemo(
		() => appointments.find((item) => item.id === selectedAppointmentId) ?? null,
		[appointments, selectedAppointmentId]
	);
	const showEmployeeSelect = isAdmin && employees.length > 1;
	const activeEmployeeName = employeesById.get(selectedEmployeeId)?.name ?? user?.employee.name ?? "";
	const showError = useCallback((errorValue: unknown, fallback: string) => {
		const message = errorValue instanceof Error ? errorValue.message : fallback;
		setError(message);
		toast.error(message, { duration: ERROR_VISIBILITY_MS });
	}, []);

	const showValidationError = useCallback((message: string) => {
		setError(message);
		toast.error(message, { duration: ERROR_VISIBILITY_MS });
	}, []);

	const loadAppointments = useCallback(
		async (employeeId: string) => {
			if (!employeeId) {
				setAppointments([]);
				return;
			}

			setAppointmentsLoading(true);
			setError(null);
			try {
				const rows = await fetchAppointmentsForEmployee(employeeId, {
					customersById,
					servicesById,
					employeesById,
				});
				setAppointments(rows);
			} catch (fetchError) {
				setAppointments([]);
				showError(fetchError, "Impossibile caricare gli appuntamenti.");
			} finally {
				setAppointmentsLoading(false);
			}
		},
		[customersById, employeesById, servicesById, showError]
	);

	const refreshAppointments = useCallback(
		async (employeeId: string) => {
			if (!employeeId) return;

			setAppointmentsLoading(true);
			setError(null);
			try {
				const supabase = getSupabaseBrowserClient();
				const { data: customerData, error: customersError } = await supabase
					.from("customers")
					.select("id, name, phone, email, note")
					.order("name", { ascending: true });

				if (customersError) throw customersError;

				const nextCustomers = ((customerData ?? []) as RawRow[])
					.map(normalizeCustomer)
					.filter((item) => item.id);
				const nextCustomersById = new Map(nextCustomers.map((item) => [item.id, item]));
				const rows = await fetchAppointmentsForEmployee(employeeId, {
					customersById: nextCustomersById,
					servicesById,
					employeesById,
				});

				setCustomers(nextCustomers);
				setAppointments(rows);
			} catch (fetchError) {
				showError(fetchError, "Impossibile aggiornare l'agenda.");
			} finally {
				setAppointmentsLoading(false);
			}
		},
		[employeesById, servicesById, showError]
	);

	useEffect(() => {
		if (!user) return;

		let cancelled = false;
		const currentUser = user;

		async function loadSupportData() {
			setLoading(true);
			setError(null);
			try {
				const supabase = getSupabaseBrowserClient();
				const [employeesResult, servicesResult, customersResult] = await Promise.all([
					supabase
						.from("employees")
						.select("id, name, role, is_active")
						.eq("is_active", true)
						.order("name", { ascending: true }),
					supabase
						.from("services")
						.select("id, name, price, duration")
						.order("name", { ascending: true }),
					supabase
						.from("customers")
						.select("id, name, phone, email, note")
						.order("name", { ascending: true }),
				]);

				if (employeesResult.error) throw employeesResult.error;
				if (servicesResult.error) throw servicesResult.error;
				if (customersResult.error) throw customersResult.error;
				if (cancelled) return;

				const employeeRows = ((employeesResult.data ?? []) as RawRow[]).map(normalizeEmployee).filter((item) => item.id);
				const serviceRows = ((servicesResult.data ?? []) as RawRow[]).map(normalizeService).filter((item) => item.id);
				const customerRows = ((customersResult.data ?? []) as RawRow[]).map(normalizeCustomer).filter((item) => item.id);
				const employeesWithCurrent = employeeRows.some((item) => item.id === currentUser.employee.id)
					? employeeRows
					: [
						...employeeRows,
						{
							id: currentUser.employee.id,
							name: currentUser.employee.name,
							role: currentUser.employee.role,
							isActive: currentUser.employee.is_active,
						},
					];
				const nextEmployeeId = currentUser.employee.role === "admin"
					? employeesWithCurrent[0]?.id ?? currentUser.employee.id
					: currentUser.employee.id;
				const employeeMap = new Map(employeesWithCurrent.map((item) => [item.id, item]));
				const customerMap = new Map(customerRows.map((item) => [item.id, item]));
				const serviceMap = new Map(serviceRows.map((item) => [item.id, item]));

				setEmployees(employeesWithCurrent);
				setServices(serviceRows);
				setCustomers(customerRows);
				setSelectedEmployeeId(nextEmployeeId);
				if (serviceRows.length === 1) {
					const defaultStartAt = getDefaultStartDateTime();
					setSelectedServiceId(serviceRows[0].id);
					setEndAt(addMinutesToInputDateTime(defaultStartAt, serviceRows[0].durationMinutes));
				}
				const appointmentRows = await fetchAppointmentsForEmployee(nextEmployeeId, {
					customersById: customerMap,
					servicesById: serviceMap,
					employeesById: employeeMap,
				});
				if (!cancelled) setAppointments(appointmentRows);
			} catch (fetchError) {
				if (!cancelled) {
					showError(fetchError, "Impossibile caricare i dati dell'agenda.");
					setAppointments([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void loadSupportData();

		return () => {
			cancelled = true;
		};
	}, [showError, user]);

	useEffect(() => {
		if (!selectedEmployeeId || loading) return;
		void loadAppointments(selectedEmployeeId);
	}, [loadAppointments, loading, selectedEmployeeId]);

	useEffect(() => {
		if (Object.keys(createFieldErrors).length === 0) return;
		const timer = window.setTimeout(() => setCreateFieldErrors({}), FIELD_ERROR_VISIBILITY_MS);
		return () => window.clearTimeout(timer);
	}, [createFieldErrors]);

	const calendarEvents = useMemo(
		() =>
			appointments.map((item) => {
				const baseText = `${item.customer_name}\n${toHourMinute(item.start_at)}-${toHourMinute(item.end_at)} | ${item.service_name}`;
				return {
					id: item.id,
					title: baseText,
					start: toZonedDateTime(item.start_at),
					end: toZonedDateTime(item.end_at),
					allDay: false,
					calendarId: "blue",
					description: item.notes ?? "",
				};
			}),
		[appointments]
	);
	const calendarEventsKey = useMemo(
		() => appointments.map((item) => `${item.id}:${item.start_at}:${item.end_at}`).join("|"),
		[appointments]
	);
	const createTimeSlots = useMemo(
		() => buildTimeSlots({
			date: getInputDatePart(startAt),
			durationMinutes: servicesById.get(selectedServiceId)?.durationMinutes ?? null,
			employeeId: selectedEmployeeId,
			appointments,
		}),
		[appointments, selectedEmployeeId, selectedServiceId, servicesById, startAt]
	);
	const editTimeSlots = useMemo(
		() => buildTimeSlots({
			date: getInputDatePart(editStartAt),
			durationMinutes: servicesById.get(editServiceId)?.durationMinutes ?? null,
			employeeId: editEmployeeId,
			appointments,
			excludeAppointmentId: selectedAppointmentId,
		}),
		[appointments, editEmployeeId, editServiceId, editStartAt, selectedAppointmentId, servicesById]
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
		defaultView: ViewType.DAY,
		initialDate: new Date(`${calendarDate}T00:00:00`),
		events: calendarEvents,
		useCalendarHeader: false,
		useEventDetailPanel: false,
		callbacks: {
			onDateChange: (date) => {
				const next = Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(TIME_ZONE).toPlainDate().toString();
				setCalendarDate(next);
			},
			onViewChange: (view) => {
				setCalendarView(view);
			},
			onEventClick: (event) => {
				openEditAppointment(String(event.id));
			},
		},
	}, `${selectedEmployeeId}:${calendarEventsKey}`);

	useEffect(() => {
		if (calendarView !== ViewType.DAY && calendarView !== ViewType.WEEK) return;

		const scrollToRelevantTime = () => {
			const content = document.querySelector<HTMLElement>(
				".df-calendar-container .df-calendar-content, .df-calendar-container .df-week-time-grid-scroller"
			);
			if (!content) return false;

			const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);
			const today = now.toPlainDate().toString();
			const targetHour = calendarDate === today
				? now.hour + now.minute / 60 - CURRENT_TIME_TOP_MARGIN_HOURS
				: AGENDA_START_HOUR;

			content.scrollTop = Math.max(
				0,
				(targetHour - CALENDAR_FIRST_HOUR) * CALENDAR_HOUR_HEIGHT
			);
			return true;
		};

		if (scrollToRelevantTime()) return;
		const timer = window.setTimeout(scrollToRelevantTime, 100);
		return () => window.clearTimeout(timer);
	}, [calendarView, calendarDate, appointments]);

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

	const clearCreateStartTime = () => {
		const date = getInputDatePart(startAt);
		const nextStartAt = date ? `${date}T${String(AGENDA_START_HOUR).padStart(2, "0")}:00` : "";
		setStartAt(nextStartAt);
		updateEndFromStart(nextStartAt, selectedServiceId);
	};

	const onSelectAgendaEmployee = (employeeId: string) => {
		setSelectedEmployeeId(employeeId);
		clearCreateStartTime();
	};

	const updateEndFromStart = (nextStartAt: string, serviceId: string) => {
		const durationMinutes = servicesById.get(serviceId)?.durationMinutes ?? null;
		setEndAt(addMinutesToInputDateTime(nextStartAt, durationMinutes));
	};

	const updateEditEndFromStart = (nextStartAt: string, serviceId: string) => {
		const durationMinutes = servicesById.get(serviceId)?.durationMinutes ?? null;
		setEditEndAt(addMinutesToInputDateTime(nextStartAt, durationMinutes));
	};

	const onSelectService = (serviceId: string) => {
		setSelectedServiceId(serviceId);
		if (createFieldErrors.service) {
			setCreateFieldErrors((current) => ({ ...current, service: false }));
		}
		if (startAt) updateEndFromStart(startAt, serviceId);
	};

	const onSelectEditService = (serviceId: string) => {
		setEditServiceId(serviceId);
		if (editStartAt) updateEditEndFromStart(editStartAt, serviceId);
	};

	const onChangeStartAt = (partial: { date?: string; time?: string }) => {
		const nextStartAt = updateInputDateTime(startAt, partial);
		setStartAt(nextStartAt);
		if (createFieldErrors.startAt) {
			setCreateFieldErrors((current) => ({ ...current, startAt: false }));
		}
		updateEndFromStart(nextStartAt, selectedServiceId);
	};

	const onChangeEditStartAt = (partial: { date?: string; time?: string }) => {
		const nextStartAt = updateInputDateTime(editStartAt, partial);
		setEditStartAt(nextStartAt);
		updateEditEndFromStart(nextStartAt, editServiceId);
	};

	const resetCreateForm = () => {
		const nextServiceId = services.length === 1 ? services[0].id : "";
		const nextStartAt = getDefaultStartDateTime();
		setCustomerMode("existing");
		setSelectedCustomerId("");
		setNewCustomerName("");
		setNewCustomerPhone("");
		setNewCustomerEmail("");
		setNewCustomerNote("");
		setCreateFieldErrors({});
		setSelectedServiceId(nextServiceId);
		setStartAt(nextStartAt);
		setEndAt(addMinutesToInputDateTime(nextStartAt, servicesById.get(nextServiceId)?.durationMinutes ?? null));
		setNotes("");
	};

	const openCreateAppointment = () => {
		resetCreateForm();
		const serviceId = services.length === 1 ? services[0].id : "";
		const nextStartAt = `${calendarDate}T${String(AGENDA_START_HOUR).padStart(2, "0")}:00`;
		setStartAt(nextStartAt);
		setEndAt(addMinutesToInputDateTime(nextStartAt, servicesById.get(serviceId)?.durationMinutes ?? null));
		setCreateAppointmentOpen(true);
	};

	const openEditAppointment = (appointmentId: string) => {
		const current = appointments.find((item) => item.id === appointmentId);
		if (!current) return;
		setSelectedAppointmentId(appointmentId);
		setEditCustomerId(current.customer_id);
		setEditServiceId(current.service_id);
		setEditEmployeeId(current.employee_id);
		setEditStartAt(toInputDateTime(current.start_at));
		setEditEndAt(toInputDateTime(current.end_at));
		setEditNotes(current.notes ?? "");
	};

	const validateNewCustomerFields = () => {
		if (customerMode !== "new") {
			setCreateFieldErrors((current) => ({
				...current,
				name: false,
				phone: false,
				email: false,
			}));
			return true;
		}

		const missingName = !newCustomerName.trim();
		const missingContact = !newCustomerPhone.trim() && !newCustomerEmail.trim();
		const nextErrors: NewCustomerFieldErrors = {
			name: missingName,
			phone: missingContact,
			email: missingContact,
		};

		setCreateFieldErrors((current) => ({ ...current, ...nextErrors }));
		if (!missingName && !missingContact) return true;

		if (missingName && missingContact) {
			showValidationError("Inserisci nome e email/telefono.");
		} else if (missingName) {
			showValidationError("Inserisci nome.");
		} else {
			showValidationError("Inserisci email/telefono.");
		}

		return false;
	};

	const validateCreateAppointmentFields = () => {
		const nextErrors: CreateFieldErrors = {};
		let valid = true;

		if (customerMode === "existing" && !selectedCustomerId) {
			nextErrors.customer = true;
			showValidationError("Seleziona un cliente.");
			valid = false;
		}
		if (!selectedServiceId) {
			nextErrors.service = true;
			showValidationError("Seleziona un servizio.");
			valid = false;
		}
		if (!getInputDatePart(startAt)) {
			nextErrors.startAt = true;
			showValidationError("Inserisci la data di inizio appuntamento.");
			valid = false;
		}

		if (Object.keys(nextErrors).length > 0) {
			setCreateFieldErrors((current) => ({ ...current, ...nextErrors }));
		}

		return valid;
	};

	const createCustomerIfNeeded = async () => {
		if (customerMode === "existing") return selectedCustomerId;

		const supabase = getSupabaseBrowserClient();
		const phone = newCustomerPhone.trim();
		const email = newCustomerEmail.trim();

		const [phoneCheck, emailCheck] = await Promise.all([
			phone
				? supabase
					.from("customers")
					.select("id, name, phone, email, note")
					.eq("phone", phone)
					.limit(1)
					.maybeSingle()
				: Promise.resolve({ data: null, error: null }),
			email
				? supabase
					.from("customers")
					.select("id, name, phone, email, note")
					.eq("email", email)
					.limit(1)
					.maybeSingle()
				: Promise.resolve({ data: null, error: null }),
		]);

		if (phoneCheck.error) throw phoneCheck.error;
		if (emailCheck.error) throw emailCheck.error;
		if (phoneCheck.data) {
			const customer = normalizeCustomer(phoneCheck.data as RawRow);
			setCustomers((prev) => prev.some((item) => item.id === customer.id)
				? prev
				: [...prev, customer].sort((a, b) => a.name.localeCompare(b.name, "it"))
			);
			return customer.id;
		}
		if (emailCheck.data) {
			const customer = normalizeCustomer(emailCheck.data as RawRow);
			setCustomers((prev) => prev.some((item) => item.id === customer.id)
				? prev
				: [...prev, customer].sort((a, b) => a.name.localeCompare(b.name, "it"))
			);
			return customer.id;
		}

		const customerPayload: Record<string, string | null> = {
			name: newCustomerName.trim(),
			phone: phone || null,
			email: email || null,
		};
		if (newCustomerNote.trim()) {
			customerPayload.note = newCustomerNote.trim();
		}

		const { data, error: insertError } = await supabase
			.from("customers")
			.insert(customerPayload)
			.select("id, name, phone, email, note")
			.single();

		if (insertError) throw insertError;
		const customer = normalizeCustomer((data ?? {}) as RawRow);
		setCustomers((prev) => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name, "it")));
		return customer.id;
	};

	const findExistingAppointmentByCustomerContact = async () => {
		const supabase = getSupabaseBrowserClient();
		const selectedCustomer = customerMode === "existing" ? customersById.get(selectedCustomerId) : null;
		const phone = (selectedCustomer?.phone ?? newCustomerPhone).trim();
		const email = (selectedCustomer?.email ?? newCustomerEmail).trim();
		const appointmentDate = getInputDatePart(startAt);

		if ((!phone && !email) || !appointmentDate) return null;

		const [phoneCheck, emailCheck] = await Promise.all([
			phone
				? supabase
					.from("customers")
					.select("id, name, phone, email, note")
					.eq("phone", phone)
				: Promise.resolve({ data: null, error: null }),
			email
				? supabase
					.from("customers")
					.select("id, name, phone, email, note")
					.eq("email", email)
				: Promise.resolve({ data: null, error: null }),
		]);

		if (phoneCheck.error) throw phoneCheck.error;
		if (emailCheck.error) throw emailCheck.error;

		const matchingCustomers = [
			...((phoneCheck.data ?? []) as RawRow[]),
			...((emailCheck.data ?? []) as RawRow[]),
		]
			.map(normalizeCustomer)
			.filter((customer, index, list) => customer.id && list.findIndex((item) => item.id === customer.id) === index);

		if (matchingCustomers.length === 0) return null;

		const nextDate = Temporal.PlainDate.from(appointmentDate).add({ days: 1 }).toString();
		const dayStart = toSupabaseTimestamp(`${appointmentDate}T00:00`);
		const dayEnd = toSupabaseTimestamp(`${nextDate}T00:00`);

		const { data: appointmentData, error: appointmentError } = await supabase
			.from("appointments")
			.select("customer_id")
			.in("customer_id", matchingCustomers.map((customer) => customer.id))
			.eq("status", ACTIVE_APPOINTMENT_STATUS)
			.gte("start_time", dayStart)
			.lt("start_time", dayEnd)
			.limit(1)
			.maybeSingle();

		if (appointmentError) throw appointmentError;
		if (!appointmentData) return null;

		const appointmentCustomerId = String((appointmentData as RawRow).customer_id ?? "");
		return matchingCustomers.find((customer) => customer.id === appointmentCustomerId) ?? matchingCustomers[0] ?? null;
	};

	const saveCreateAppointment = async ({ skipDuplicateCheck = false }: { skipDuplicateCheck?: boolean } = {}) => {
		setSaving(true);
		setError(null);

		try {
			if (!selectedEmployeeId) throw new Error("Nessun addetto selezionato.");
			if (!validateCreateAppointmentFields()) return;
			if (!validateNewCustomerFields()) return;

			const timeError = validateTimes(startAt, endAt);
			if (timeError) throw new Error(timeError);

			if (!skipDuplicateCheck) {
				const duplicateCustomer = await findExistingAppointmentByCustomerContact();
				if (duplicateCustomer) {
					setDuplicateAppointmentWarning({ customerName: duplicateCustomer.name });
					return;
				}
			}

			const service = servicesById.get(selectedServiceId);
			const customerId = await createCustomerIfNeeded();
			const durationMinutes = getDurationMinutes(startAt, endAt);
			await assertSlotAvailable({
				employeeId: selectedEmployeeId,
				startAt,
				endAt,
			});

			const supabase = getSupabaseBrowserClient();
			const appointmentPayload: Record<string, string | number | null> = {
				customer_id: customerId,
				employee_id: selectedEmployeeId,
				service_id: selectedServiceId,
				start_time: toSupabaseTimestamp(startAt),
				end_time: toSupabaseTimestamp(endAt),
				status: ACTIVE_APPOINTMENT_STATUS,
				final_price: service?.price ?? null,
				final_duration_minutes: durationMinutes,
				appointment_source: "admin",
			};
			if (notes.trim()) {
				appointmentPayload.staff_note = notes.trim();
			}

			const { error: insertError } = await supabase.from("appointments").insert(appointmentPayload);

			if (insertError) throw insertError;
			toast.success("Appuntamento salvato correttamente.", { duration: ERROR_VISIBILITY_MS });
			resetCreateForm();
			setCreateAppointmentOpen(false);
			await refreshAppointments(selectedEmployeeId);
		} catch (saveError) {
			showError(saveError, "Impossibile salvare l'appuntamento.");
		} finally {
			setSaving(false);
		}
	};

	const onCreateAppointment = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void saveCreateAppointment();
	};

	const onDeleteAppointment = async (id: string) => {
		setError(null);
		const supabase = getSupabaseBrowserClient();
		const { error: deleteError } = await supabase
			.from("appointments")
			.update({ status: "cancelled", updated_at: new Date().toISOString() })
			.eq("id", id);

		if (deleteError) {
			showError(deleteError, "Impossibile cancellare la prenotazione.");
			return;
		}

		setAppointments((prev) => prev.filter((item) => item.id !== id));
	};

	const onSaveAppointmentFromModal = async () => {
		if (!selectedAppointmentId) return;
		setSaving(true);
		setError(null);

		try {
			if (!editCustomerId) throw new Error("Seleziona un cliente.");
			if (!editServiceId) throw new Error("Seleziona un servizio.");
			if (!editEmployeeId) throw new Error("Seleziona un addetto.");

			const timeError = validateTimes(editStartAt, editEndAt);
			if (timeError) throw new Error(timeError);

			const service = servicesById.get(editServiceId);
			await assertSlotAvailable({
				employeeId: editEmployeeId,
				startAt: editStartAt,
				endAt: editEndAt,
				excludeAppointmentId: selectedAppointmentId,
			});

			const supabase = getSupabaseBrowserClient();
			const { error: updateError } = await supabase
				.from("appointments")
				.update({
					customer_id: editCustomerId,
					service_id: editServiceId,
					employee_id: editEmployeeId,
					start_time: toSupabaseTimestamp(editStartAt),
					end_time: toSupabaseTimestamp(editEndAt),
					final_price: service?.price ?? null,
					final_duration_minutes: getDurationMinutes(editStartAt, editEndAt),
					staff_note: editNotes.trim() || null,
					updated_at: new Date().toISOString(),
				})
				.eq("id", selectedAppointmentId);

			if (updateError) throw updateError;
			setSelectedAppointmentId(null);
			await loadAppointments(selectedEmployeeId);
		} catch (saveError) {
			showError(saveError, "Impossibile salvare le modifiche.");
		} finally {
			setSaving(false);
		}
	};

	const onDeleteFromModal = async () => {
		if (!selectedAppointmentId) return;
		await onDeleteAppointment(selectedAppointmentId);
		setSelectedAppointmentId(null);
	};

	return (
		<section className="-mt-4 space-y-3">
			{error ? <p className="text-sm text-red-600">{error}</p> : null}

			<header className="flex flex-wrap items-end justify-between gap-3">
				{/* <div className="space-y-0.5">
					<h1 className="text-2xl font-semibold text-zinc-900">Agenda</h1>
					<p className="text-sm text-zinc-600">
						{loading ? "Caricamento dati agenda..." : `Agenda di ${activeEmployeeName || "addetto"}`}
					</p>
				</div> */}

				{showEmployeeSelect ? (
					<div className="w-full sm:w-64">
						<label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="agenda-employee">
							Addetto
						</label>
						<Select value={selectedEmployeeId} onValueChange={onSelectAgendaEmployee}>
							<SelectTrigger id="agenda-employee">
								<SelectValue placeholder="Seleziona addetto" />
							</SelectTrigger>
							<SelectContent>
								{employees.map((employee) => (
									<SelectItem key={employee.id} value={employee.id}>
										{employee.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}
			</header>

			<div className={cn(
				"agenda-calendar overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:h-[calc(100dvh-8.5rem)]",
				calendarView === ViewType.DAY && "agenda-calendar--day"
			)}>
				<div className="relative flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3">
					<div className="min-w-[13rem]">
						<p className="text-lg font-semibold capitalize text-zinc-900">{formatCalendarHeading(calendarDate, calendarView)}</p>
						{appointmentsLoading ? <p className="text-xs text-zinc-500">Aggiornamento appuntamenti...</p> : null}
					</div>
					<div className="order-3 flex w-full justify-center lg:absolute lg:left-1/2 lg:w-auto lg:-translate-x-1/2">
						<div className="flex rounded-lg bg-zinc-100 p-1">
							<Button
								type="button"
								variant="ghost"
								className={`h-9 cursor-pointer px-4 text-zinc-600 hover:text-zinc-900 ${calendarView === ViewType.DAY ? "bg-white text-zinc-900 shadow-sm hover:bg-white" : ""}`}
								onClick={() => changeCalendarView(ViewType.DAY)}
							>
								Giorno
							</Button>
							<Button
								type="button"
								variant="ghost"
								className={`h-9 cursor-pointer px-4 text-zinc-600 hover:text-zinc-900 ${calendarView === ViewType.WEEK ? "bg-white text-zinc-900 shadow-sm hover:bg-white" : ""}`}
								onClick={() => changeCalendarView(ViewType.WEEK)}
							>
								Settimana
							</Button>
							<Button
								type="button"
								variant="ghost"
								className={`h-9 cursor-pointer px-4 text-zinc-600 hover:text-zinc-900 ${calendarView === ViewType.MONTH ? "bg-white text-zinc-900 shadow-sm hover:bg-white" : ""}`}
								onClick={() => changeCalendarView(ViewType.MONTH)}
							>
								Mese
							</Button>
						</div>
					</div>
					<div className="ml-auto flex items-center gap-2">
						<input
							type="date"
							aria-label="Scegli data agenda"
							value={calendarDate}
							onChange={(e) => changeCalendarDate(e.target.value)}
							className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700"
						/>
						<Button type="button" variant="outline" size="icon" aria-label="Periodo precedente" className="h-9 w-9 cursor-pointer" onClick={() => moveCalendarDate(-1)}>
							<ChevronLeft className="size-4" />
						</Button>
						<Button type="button" variant="outline" className="h-9 cursor-pointer px-3" onClick={() => changeCalendarDate(Temporal.Now.plainDateISO(TIME_ZONE).toString())}>
							<CalendarDays className="mr-1.5 size-4" /> Oggi
						</Button>
						<Button type="button" variant="outline" size="icon" aria-label="Periodo successivo" className="h-9 w-9 cursor-pointer" onClick={() => moveCalendarDate(1)}>
							<ChevronRight className="size-4" />
						</Button>
					</div>
				</div>
				<div
					className={cn(
						calendarView === ViewType.DAY ? "h-auto md:h-[600px]" : "h-[600px]",
						"lg:h-full"
					)}
					onContextMenuCapture={(event) => {
						event.preventDefault();
						const appointmentElement = (event.target as HTMLElement).closest<HTMLElement>("[data-event-id]");
						setCalendarContextMenu({
							x: event.clientX,
							y: event.clientY,
							appointmentId: appointmentElement?.getAttribute("data-event-id") ?? undefined,
						});
					}}
					onTouchStart={(event) => {
						const touch = event.touches[0];
						if (!touch) return;
						longPressTimer.current = window.setTimeout(() => {
							const appointmentElement = (event.target as HTMLElement).closest<HTMLElement>("[data-event-id]");
							setCalendarContextMenu({
								x: touch.clientX,
								y: touch.clientY,
								appointmentId: appointmentElement?.getAttribute("data-event-id") ?? undefined,
							});
						}, 600);
					}}
					onTouchEnd={() => {
						if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
						longPressTimer.current = null;
					}}
					onTouchMove={() => {
						if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
						longPressTimer.current = null;
					}}
				>
					<DayFlowCalendar key={calendarEventsKey} calendar={calendar} />
				</div>
			</div>

			{createAppointmentOpen ? (
				<div className="fixed inset-0 z-50 flex items-end bg-zinc-950/45 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6">
					<Card
						role="dialog"
						aria-modal="true"
						aria-labelledby="create-appointment-title"
						className="max-h-[94dvh] w-full overflow-y-auto rounded-b-none border-0 shadow-2xl shadow-black/20 sm:max-w-3xl sm:rounded-2xl"
					>
						<CardHeader className="sticky top-0 z-10 flex flex-row items-center justify-between gap-4 border-b border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
									<CalendarPlus2 className="size-5" />
								</div>
								<div className="min-w-0">
									<CardTitle id="create-appointment-title" className="text-xl">Nuovo appuntamento</CardTitle>
									<p className="mt-1 text-sm text-zinc-500">Inserisci cliente, servizio e orario.</p>
								</div>
							</div>
							<Button type="button" variant="ghost" size="icon" aria-label="Chiudi modale" className="shrink-0 rounded-full text-zinc-500 hover:text-zinc-900" onClick={() => setCreateAppointmentOpen(false)}>
								<X className="size-5" />
							</Button>
						</CardHeader>
						<CardContent className="p-5 sm:p-6">
							<form onSubmit={onCreateAppointment} className="grid gap-x-4 gap-y-5 md:grid-cols-2">
								<div>
									<label className="mb-2 block text-sm font-medium text-zinc-700">Cliente</label>
									<Select
										value={customerMode === "new" ? NEW_CUSTOMER_VALUE : selectedCustomerId}
										onValueChange={(value) => {
											if (value === NEW_CUSTOMER_VALUE) {
												setCustomerMode("new");
												setSelectedCustomerId("");
												setCreateFieldErrors({});
												return;
											}
											setCustomerMode("existing");
											setSelectedCustomerId(value);
											setCreateFieldErrors((current) => ({ ...current, customer: false }));
										}}
									>
										<SelectTrigger className={cn("h-11 rounded-xl bg-white", createFieldErrors.customer && "border-red-500 ring-2 ring-red-100")}>
											<SelectValue placeholder="Seleziona cliente" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NEW_CUSTOMER_VALUE}>Nuovo cliente</SelectItem>
											{customers.map((customer) => (
												<SelectItem key={customer.id} value={customer.id}>
													{customer.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-zinc-700">Servizio</label>
									<Select value={selectedServiceId} onValueChange={onSelectService}>
										<SelectTrigger className={cn("h-11 rounded-xl bg-white", createFieldErrors.service && "border-red-500 ring-2 ring-red-100")}>
											<SelectValue placeholder="Seleziona servizio" />
										</SelectTrigger>
										<SelectContent>
											{services.map((service) => (
												<SelectItem key={service.id} value={service.id}>
													{service.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{customerMode === "new" ? (
									<div className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 md:col-span-2 md:grid-cols-2">
										<div>
											<label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="new-customer-name">
												Nome cliente
											</label>
											<input
												id="new-customer-name"
												value={newCustomerName}
												onChange={(e) => {
													setNewCustomerName(e.target.value);
													if (createFieldErrors.name) {
														setCreateFieldErrors((current) => ({ ...current, name: false }));
													}
												}}
												placeholder="Nome nuovo cliente"
												className={cn(
													"h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-zinc-200",
													createFieldErrors.name ? "border-red-500" : "border-zinc-300"
												)}
											/>
										</div>
										<div>
											<label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="new-customer-phone">
												Telefono
											</label>
											<input
												id="new-customer-phone"
												value={newCustomerPhone}
												onChange={(e) => {
													setNewCustomerPhone(e.target.value);
													if (createFieldErrors.phone || createFieldErrors.email) {
														setCreateFieldErrors((current) => ({ ...current, phone: false, email: false }));
													}
												}}
												placeholder="Numero di telefono"
												className={cn(
													"h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-zinc-200",
													createFieldErrors.phone ? "border-red-500" : "border-zinc-300"
												)}
											/>
										</div>
										<div>
											<label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="new-customer-email">
												Email
											</label>
											<input
												id="new-customer-email"
												type="email"
												value={newCustomerEmail}
												onChange={(e) => {
													setNewCustomerEmail(e.target.value);
													if (createFieldErrors.phone || createFieldErrors.email) {
														setCreateFieldErrors((current) => ({ ...current, phone: false, email: false }));
													}
												}}
												placeholder="Email cliente"
												className={cn(
													"h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-zinc-200",
													createFieldErrors.email ? "border-red-500" : "border-zinc-300"
												)}
											/>
										</div>
										<div>
											<label className="mb-1 block text-xs font-medium text-zinc-600" htmlFor="new-customer-note">
												Nota cliente
											</label>
											<input id="new-customer-note" value={newCustomerNote} onChange={(e) => setNewCustomerNote(e.target.value)} placeholder="Nota cliente" className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-zinc-200" />
										</div>
										<p className="text-xs text-zinc-600 md:col-span-2">
											Per un nuovo cliente servono nome e almeno un contatto tra email e telefono.
										</p>
									</div>
								) : null}

								<div>
									<label className="mb-2 block text-sm font-medium text-zinc-700" htmlFor="appointment-employee">
										Addetto
									</label>
									<input id="appointment-employee" value={activeEmployeeName} readOnly placeholder="Addetto" className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 text-sm font-medium text-zinc-600" />
								</div>
								<SlotDateTimeFields
									idPrefix="appointment-start"
									label="Inizio appuntamento"
									value={startAt}
									slots={createTimeSlots}
									onChange={onChangeStartAt}
									hasError={createFieldErrors.startAt}
								/>
								<ReadonlyDateTimeField
									label="Fine appuntamento"
									value={endAt}
								/>
								<div>
									<label className="mb-2 block text-sm font-medium text-zinc-700" htmlFor="appointment-notes">
										Note staff
									</label>
									<input id="appointment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aggiungi una nota facoltativa" className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
								</div>
								<div className="-mx-5 -mb-5 mt-1 flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 md:col-span-2 sm:-mx-6 sm:-mb-6 sm:px-6">
									<Button type="button" variant="ghost" className="text-zinc-600" onClick={() => setCreateAppointmentOpen(false)}>Annulla</Button>
									<Button type="submit" className="min-w-40 gap-2 rounded-xl shadow-sm" disabled={saving || loading}>
										<CalendarPlus2 className="size-4" />
										{saving ? "Salvataggio..." : "Crea appuntamento"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			) : null}

			{calendarContextMenu ? (
				<>
					<div className="fixed inset-0 z-[60]" aria-hidden="true" onClick={() => setCalendarContextMenu(null)} />
					<div
						className="fixed z-[61] min-w-52 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
						style={{ left: calendarContextMenu.x, top: calendarContextMenu.y }}
					>
						<Button
							type="button"
							variant="ghost"
							className="w-full justify-start"
							onClick={() => {
								const appointmentId = calendarContextMenu.appointmentId;
								setCalendarContextMenu(null);
								if (appointmentId) openEditAppointment(appointmentId);
								else openCreateAppointment();
							}}
						>
							{calendarContextMenu.appointmentId ? "Modifica appuntamento" : "Nuovo appuntamento"}
						</Button>
					</div>
				</>
			) : null}

			{selectedAppointment ? (
				<div className="fixed inset-0 z-50 flex items-end bg-zinc-950/45 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6">
					<Card
						role="dialog"
						aria-modal="true"
						aria-labelledby="edit-appointment-title"
						className="max-h-[94dvh] w-full overflow-y-auto rounded-b-none border-0 shadow-2xl shadow-black/20 sm:max-w-3xl sm:rounded-2xl"
					>
						<CardHeader className="sticky top-0 z-10 flex flex-row items-center justify-between gap-4 border-b border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
									<Pencil className="size-5" />
								</div>
								<div className="min-w-0">
									<CardTitle id="edit-appointment-title" className="text-xl">Modifica appuntamento</CardTitle>
									<p className="mt-1 text-sm text-zinc-500">Aggiorna i dettagli della prenotazione.</p>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Chiudi modale"
								className="shrink-0 rounded-full text-zinc-500 hover:text-zinc-900"
								onClick={() => setSelectedAppointmentId(null)}
							>
								<X className="size-5" />
							</Button>
						</CardHeader>

						<CardContent className="p-5 sm:p-6">
						<div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
							<div>
								<label className="mb-2 block text-sm font-medium text-zinc-700">Cliente</label>
								<Select value={editCustomerId} onValueChange={setEditCustomerId}>
									<SelectTrigger className="h-11 rounded-xl bg-white">
										<SelectValue placeholder="Cliente" />
									</SelectTrigger>
									<SelectContent>
										{customers.map((customer) => (
											<SelectItem key={customer.id} value={customer.id}>
												{customer.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium text-zinc-700">Servizio</label>
								<Select value={editServiceId} onValueChange={onSelectEditService}>
									<SelectTrigger className="h-11 rounded-xl bg-white">
										<SelectValue placeholder="Servizio" />
									</SelectTrigger>
									<SelectContent>
										{services.map((service) => (
											<SelectItem key={service.id} value={service.id}>
												{service.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{isAdmin && employees.length > 1 ? (
								<div>
									<label className="mb-2 block text-sm font-medium text-zinc-700">Addetto</label>
									<Select value={editEmployeeId} onValueChange={setEditEmployeeId}>
										<SelectTrigger className="h-11 rounded-xl bg-white">
											<SelectValue placeholder="Addetto" />
										</SelectTrigger>
										<SelectContent>
											{employees.map((employee) => (
												<SelectItem key={employee.id} value={employee.id}>
													{employee.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							) : (
								<div>
									<label className="mb-2 block text-sm font-medium text-zinc-700" htmlFor="edit-appointment-employee">
										Addetto
									</label>
									<input id="edit-appointment-employee" value={employeesById.get(editEmployeeId)?.name ?? activeEmployeeName} readOnly placeholder="Addetto" className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 text-sm font-medium text-zinc-600" />
								</div>
							)}
							<SlotDateTimeFields
								idPrefix="edit-appointment-start"
								label="Inizio appuntamento"
								value={editStartAt}
								slots={editTimeSlots}
								onChange={onChangeEditStartAt}
							/>
							<ReadonlyDateTimeField
								label="Fine appuntamento"
								value={editEndAt}
							/>
							<div>
								<label className="mb-2 block text-sm font-medium text-zinc-700" htmlFor="edit-appointment-notes">
									Note staff
								</label>
								<input id="edit-appointment-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Aggiungi una nota facoltativa" className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200" />
							</div>
						</div>

						<div className="-mx-5 -mb-5 mt-6 flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
							<Button type="button" variant="ghost" className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => void onDeleteFromModal()}>
								<Trash2 className="size-4" />
								Elimina appuntamento
							</Button>
							<div className="flex items-center justify-end gap-3">
								<Button type="button" variant="ghost" className="text-zinc-600" onClick={() => setSelectedAppointmentId(null)}>Annulla</Button>
								<Button type="button" className="min-w-40 gap-2 rounded-xl shadow-sm" disabled={saving} onClick={onSaveAppointmentFromModal}>
									<Save className="size-4" />
									{saving ? "Salvataggio..." : "Salva modifiche"}
								</Button>
							</div>
						</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			<ConfirmDialog
				open={Boolean(duplicateAppointmentWarning)}
				title="Prenotazione già presente"
				description={`Esiste già una prenotazione per ${duplicateAppointmentWarning?.customerName ?? "questo cliente"} nella giornata selezionata. Procedere lo stesso?`}
				confirmLabel="Procedere"
				cancelLabel="Annulla"
				isLoading={saving}
				onConfirm={() => {
					setDuplicateAppointmentWarning(null);
					void saveCreateAppointment({ skipDuplicateCheck: true });
				}}
				onCancel={() => setDuplicateAppointmentWarning(null)}
			/>

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

				/* Manteniamo nascosti i pannelli di gestione nativi non usati dall'agenda. */
				.agenda-calendar .df-event-detail-panel,
				.agenda-calendar .df-sidebar,
				.agenda-calendar .df-calendar-sidebar-aside {
					display: none !important;
				}

				.agenda-calendar .df-right-panel {
					display: none !important;
				}

				.agenda-calendar--day .df-right-panel {
					background: #fafafa;
					border-left: 1px solid #e4e4e7;
					display: block !important;
					width: 32%;
				}

				.agenda-calendar--day .df-mini-calendar {
					background: #ffffff;
					border-bottom: 1px solid #e4e4e7;
				}

				.agenda-calendar--day .df-right-panel-events-inner {
					padding: 1rem;
				}

				.agenda-calendar--day .df-right-panel-date-heading {
					background: #fafafa;
					color: #18181b;
					text-transform: capitalize;
				}

				.agenda-calendar--day .df-right-panel-event-card {
					border: 1px solid rgba(99, 102, 241, 0.24);
					border-radius: 0.65rem;
					box-shadow: 0 2px 5px rgba(49, 46, 129, 0.08);
					overflow: hidden;
				}

				.agenda-calendar .df-calendar-view-container {
					width: 100%;
				}

				.agenda-calendar .df-day-content[data-switcher-mode] {
					width: 100% !important;
				}

				.agenda-calendar--day .df-day-content[data-switcher-mode] {
					width: 68% !important;
				}

				@media (max-width: 767px) {
					.agenda-calendar--day .df-calendar-wrapper,
					.agenda-calendar--day .df-calendar-container,
					.agenda-calendar--day .df-calendar,
					.agenda-calendar--day .df-day-view {
						height: auto !important;
					}

					.agenda-calendar--day .df-day-view {
						flex-direction: column;
					}

					.agenda-calendar--day .df-day-content[data-switcher-mode] {
						flex: none;
						height: 600px;
						width: 100% !important;
					}

					.agenda-calendar--day .df-right-panel {
						border-left: 0;
						border-top: 1px solid #e4e4e7;
						height: auto;
						width: 100%;
					}

					.agenda-calendar--day .df-right-panel-layout {
						height: auto;
					}

					.agenda-calendar--day .df-right-panel-events {
						overflow: visible;
					}
				}

				/* Il periodo selezionato è già mostrato nella barra dell'agenda. */
				.agenda-calendar .df-view-header-container {
					display: none;
				}

				.df-event {
					white-space: pre-line !important;
				}
			`}</style>
		</section>
	);
}

function SlotDateTimeFields({
	idPrefix,
	label,
	value,
	slots,
	onChange,
	hasError = false,
}: {
	idPrefix: string;
	label: string;
	value: string;
	slots: Array<{ value: string; label: string; disabled: boolean }>;
	onChange: (partial: { date?: string; time?: string }) => void;
	hasError?: boolean;
}) {
	const date = getInputDatePart(value);
	const selectedTime = value.split("T")[1] ?? "";

	return (
		<div className={cn("rounded-2xl border bg-zinc-50/70 p-4 md:col-span-2", hasError ? "border-red-300" : "border-zinc-200")}>
			<div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
				<Clock3 className="size-4 text-zinc-500" />
				{label}
			</div>
			<div className="mt-4 grid items-start gap-4 md:grid-cols-[13rem_1fr]">
				<div>
					<label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500" htmlFor={`${idPrefix}-date`}>
						Data
					</label>
					<input
						id={`${idPrefix}-date`}
						required
						type="date"
						value={date}
						onChange={(event) => onChange({ date: event.target.value })}
						className={cn(
							"h-11 w-full self-start rounded-xl border bg-white px-3 text-sm text-zinc-900 outline-none transition focus:ring-2 focus:ring-zinc-200",
							hasError ? "border-red-500" : "border-zinc-300"
						)}
					/>
				</div>
				<div className="min-w-0">
					<p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Orario disponibile</p>
					<div className="max-h-44 overflow-y-auto pr-1">
						<div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
							{slots.map((slot) => {
								const selected = selectedTime === slot.value;
								return (
									<button
										key={slot.value}
										type="button"
										disabled={slot.disabled}
										onClick={() => onChange({ time: slot.value })}
										className={cn(
											"h-9 rounded-lg border px-2 text-xs font-medium tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
											selected
												? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
												: "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50",
											slot.disabled && "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 hover:border-zinc-200 hover:bg-zinc-100",
											hasError && !selected && "border-red-300"
										)}
									>
										{slot.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ReadonlyDateTimeField({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div>
			<label className="mb-2 block text-sm font-medium text-zinc-700">
				{label}
			</label>
			<div className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-3 text-sm font-medium text-zinc-600">
				<Clock3 className="size-4 shrink-0 text-zinc-400" />
				{value ? toInputDateTime(value).replace("T", " ") : EMPTY_DATE_TIME_LABEL}
			</div>
		</div>
	);
}
