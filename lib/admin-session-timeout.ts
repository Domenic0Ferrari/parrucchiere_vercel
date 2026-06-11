const ADMIN_LAST_ACTIVITY_KEY = "admin_last_activity_at";

export const ADMIN_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export function markAdminSessionActivity() {
	window.localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearAdminSessionActivity() {
	window.localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
}

export function isAdminSessionTimedOut() {
	const lastActivity = window.localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY);
	if (!lastActivity) {
		return true;
	}

	const lastActivityAt = Number(lastActivity);
	if (!Number.isFinite(lastActivityAt)) {
		return true;
	}

	return Date.now() - lastActivityAt > ADMIN_SESSION_TIMEOUT_MS;
}
