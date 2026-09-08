export type OpeningHour = {
	day_of_week: number;
	is_open: boolean;
	open_time: string | null;
	break_start: string | null;
	break_end: string | null;
	close_time: string | null;
};

export type SalonClosure = {
	start_date: string;
	end_date: string;
	all_day: boolean;
	start_time: string | null;
	end_time: string | null;
};

export type TimeInterval = { start: string; end: string };

function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
	return start < otherEnd && end > otherStart;
}

function dayOfWeek(date: string) {
	// ISO weekday: Monday 1 through Sunday 7. The date is intentionally read in UTC.
	const day = new Date(`${date}T12:00:00Z`).getUTCDay();
	return day === 0 ? 7 : day;
}

export function isSalonIntervalAvailable({
	date,
	start,
	end,
	openingHours,
	closures,
}: {
	date: string;
	start: string;
	end: string;
	openingHours: OpeningHour[];
	closures: SalonClosure[];
}) {
	if (!date || !start || !end || start >= end) return false;

	const hours = openingHours.find((item) => item.day_of_week === dayOfWeek(date));
	if (!hours?.is_open || !hours.open_time || !hours.close_time) return false;
	if (start < hours.open_time.slice(0, 5) || end > hours.close_time.slice(0, 5)) return false;

	if (
		hours.break_start &&
		hours.break_end &&
		overlaps(start, end, hours.break_start.slice(0, 5), hours.break_end.slice(0, 5))
	) return false;

	return !closures.some((closure) => {
		if (date < closure.start_date || date > closure.end_date) return false;
		if (closure.all_day) return true;
		if (!closure.start_time || !closure.end_time) return true;
		return overlaps(start, end, closure.start_time.slice(0, 5), closure.end_time.slice(0, 5));
	});
}

export function buildAvailableSlots({
	date,
	durationMinutes,
	openingHours,
	closures,
	busyIntervals = [],
	stepMinutes = 15,
}: {
	date: string;
	durationMinutes: number | null;
	openingHours: OpeningHour[];
	closures: SalonClosure[];
	busyIntervals?: TimeInterval[];
	stepMinutes?: number;
}) {
	if (!date || !durationMinutes || durationMinutes <= 0) return [];
	const slots: string[] = [];
	for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
		const start = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
		const ending = minutes + durationMinutes;
		if (ending > 24 * 60) continue;
		const end = `${String(Math.floor(ending / 60)).padStart(2, "0")}:${String(ending % 60).padStart(2, "0")}`;
		if (!isSalonIntervalAvailable({ date, start, end, openingHours, closures })) continue;
		if (busyIntervals.some((busy) => overlaps(start, end, busy.start, busy.end))) continue;
		slots.push(start);
	}
	return slots;
}
