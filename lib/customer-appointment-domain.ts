import "server-only";

import { Temporal } from "temporal-polyfill";
import { buildAvailableSlots, type OpeningHour, type SalonClosure } from "@/lib/salon-availability";
import { serviceClient } from "@/lib/customer-account";

export const CUSTOMER_TIME_ZONE = "Europe/Rome";
export const CHANGE_CUTOFF_HOURS = 24;
export const BOOKING_DAYS_AHEAD = 28;

export function changeCutoff() {
	return Temporal.Now.instant().add({ hours: CHANGE_CUTOFF_HOURS });
}

export function canCustomerChange(startTime: string, status: string) {
	try { return status === "scheduled" && Temporal.Instant.compare(Temporal.Instant.from(startTime), changeCutoff()) >= 0; }
	catch { return false; }
}

export function parseChangeInput(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const data = value as Record<string, unknown>;
	if (typeof data.serviceId !== "string" || typeof data.employeeId !== "string" || typeof data.date !== "string" || typeof data.time !== "string") return null;
	if (!/^[A-Za-z0-9_-]{1,100}$/.test(data.serviceId) || !/^[A-Za-z0-9_-]{1,100}$/.test(data.employeeId) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !/^\d{2}:\d{2}$/.test(data.time)) return null;
	try {
		const day = Temporal.PlainDate.from(data.date);
		const today = Temporal.Now.zonedDateTimeISO(CUSTOMER_TIME_ZONE).toPlainDate();
		if (day.toString() !== data.date || today.until(day).days < 0 || today.until(day).days >= BOOKING_DAYS_AHEAD) return null;
		Temporal.PlainTime.from(data.time);
		return { serviceId: data.serviceId, employeeId: data.employeeId, date: data.date, time: data.time };
	} catch { return null; }
}

export async function customerAvailableSlots(input: { appointmentId: string; serviceId: string; employeeId: string; date: string; durationOverride?: number }) {
	const db = serviceClient();
	const date = Temporal.PlainDate.from(input.date);
	const dayStart = date.toZonedDateTime(CUSTOMER_TIME_ZONE).toInstant();
	const dayEnd = date.add({ days: 1 }).toZonedDateTime(CUSTOMER_TIME_ZONE).toInstant();
	const [service, employee, appointments, salon] = await Promise.all([
		db.from("services").select("id, name, price, duration").eq("id", input.serviceId).eq("is_active", true).maybeSingle(),
		db.from("employees").select("id, name").eq("id", input.employeeId).eq("is_active", true).maybeSingle(),
		db.from("appointments").select("id, start_time, end_time").eq("employee_id", input.employeeId).eq("status", "scheduled").lt("start_time", dayEnd.toString()).gt("end_time", dayStart.toString()),
		db.from("salon").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle(),
	]);
	for (const result of [service, employee, appointments, salon]) if (result.error) throw result.error;
	if (!service.data || !employee.data) return null;
	const duration = input.durationOverride ?? Number(service.data.duration);
	if (!Number.isSafeInteger(duration) || duration < 1 || duration > 720) return null;
	const salonId = salon.data?.id;
	const [hours, closures] = salonId ? await Promise.all([
		db.from("salon_opening_hours").select("day_of_week, is_open, open_time, break_start, break_end, close_time").eq("salon_id", salonId),
		db.from("salon_closures").select("start_date, end_date, all_day, start_time, end_time").eq("salon_id", salonId),
	]) : [{ data: [], error: null }, { data: [], error: null }];
	if (hours.error) throw hours.error;
	if (closures.error) throw closures.error;
	const busyIntervals = (appointments.data ?? []).filter((row) => row.id !== input.appointmentId).map((row) => ({
		start: Temporal.Instant.from(row.start_time).toZonedDateTimeISO(CUSTOMER_TIME_ZONE).toPlainTime().toString({ smallestUnit: "minute" }),
		end: Temporal.Instant.from(row.end_time).toZonedDateTimeISO(CUSTOMER_TIME_ZONE).toPlainTime().toString({ smallestUnit: "minute" }),
	}));
	const rules = { date: input.date, durationMinutes: duration, openingHours: (hours.data ?? []) as OpeningHour[], closures: (closures.data ?? []) as SalonClosure[] };
	const allSlots = buildAvailableSlots(rules);
	const available = new Set(buildAvailableSlots({ ...rules, busyIntervals }).filter((time) => {
		const start = Temporal.PlainDateTime.from(`${input.date}T${time}`).toZonedDateTime(CUSTOMER_TIME_ZONE).toInstant();
		return Temporal.Instant.compare(start, changeCutoff()) >= 0;
	}));
	return { service: service.data, employee: employee.data, duration, slots: allSlots.map((time) => ({ time, disabled: !available.has(time) })), available };
}
