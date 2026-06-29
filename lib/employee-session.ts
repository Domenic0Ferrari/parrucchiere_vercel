import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
	clearAdminSessionActivity,
	isAdminSessionTimedOut,
	markAdminSessionActivity,
} from "@/lib/admin-session-timeout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type EmployeeRole = "admin" | "staff";

export type Employee = {
	id: string;
	auth_user_id: string;
	name: string;
	role: EmployeeRole;
	is_active: boolean;
};

export class EmployeeSessionError extends Error {
	code:
		| "INVALID_CREDENTIALS"
		| "UNAUTHORIZED"
		| "INACTIVE"
		| "SESSION_MISSING"
		| "UNKNOWN";

	constructor(
		message: string,
		code:
			| "INVALID_CREDENTIALS"
			| "UNAUTHORIZED"
			| "INACTIVE"
			| "SESSION_MISSING"
			| "UNKNOWN"
	) {
		super(message);
		this.name = "EmployeeSessionError";
		this.code = code;
	}
}

type EmployeeRow = {
	id: string;
	auth_user_id: string;
	name: string;
	role: string;
	is_active: boolean;
};

function isEmployeeRole(value: string): value is EmployeeRole {
	return value === "admin" || value === "staff";
}

function normalizeEmployee(row: EmployeeRow | null): Employee | null {
	if (!row || !isEmployeeRole(row.role)) {
		return null;
	}

	return {
		id: row.id,
		auth_user_id: row.auth_user_id,
		name: row.name,
		role: row.role,
		is_active: row.is_active,
	};
}

async function signOutAndClearSession(supabase: SupabaseClient) {
	clearAdminSessionActivity();
	await supabase.auth.signOut();
}

function debugEmployeeSession(message: string, payload?: unknown) {
	if (process.env.NODE_ENV === "production") {
		return;
	}

	if (typeof payload === "undefined") {
		console.log(`[employee-session] ${message}`);
		return;
	}

	console.log(`[employee-session] ${message}`, payload);
}

export async function fetchEmployeeByAuthUserId(
	supabase: SupabaseClient,
	authUserId: string
): Promise<Employee | null> {
	debugEmployeeSession("Query employees by auth_user_id", { authUserId });

	const { data, error } = await supabase
		.from("employees")
		.select("id, auth_user_id, name, role, is_active")
		.eq("auth_user_id", authUserId)
		.maybeSingle<EmployeeRow>();

	if (error) {
		debugEmployeeSession("Query employees failed", {
			authUserId,
			error,
		});
		throw new EmployeeSessionError(
			"Impossibile recuperare i dati del dipendente.",
			"UNKNOWN"
		);
	}

	debugEmployeeSession("Query employees result", { authUserId, data });

	return normalizeEmployee(data ?? null);
}

export async function loadEmployeeForSession(
	supabase: SupabaseClient,
	session: Session | null
): Promise<Employee | null> {
	if (!session) {
		return null;
	}

	if (isAdminSessionTimedOut()) {
		await signOutAndClearSession(supabase);
		return null;
	}

	const employee = await fetchEmployeeByAuthUserId(supabase, session.user.id);

	if (!employee || !employee.is_active) {
		await signOutAndClearSession(supabase);
		return null;
	}

	markAdminSessionActivity();
	return employee;
}

export async function signInEmployee(
	email: string,
	password: string
): Promise<Employee> {
	const supabase = getSupabaseBrowserClient();

	const { data, error: signInError } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (signInError) {
		debugEmployeeSession("Supabase signInWithPassword failed", {
			email,
			error: signInError,
		});
		throw new EmployeeSessionError(
			"Credenziali non valide. Riprova.",
			"INVALID_CREDENTIALS"
		);
	}

	const user = data.user ?? data.session?.user;
	debugEmployeeSession("Supabase signInWithPassword success", {
		email,
		userId: user?.id ?? null,
		hasSession: Boolean(data.session),
	});

	if (!user) {
		await signOutAndClearSession(supabase);
		throw new EmployeeSessionError(
			"Impossibile recuperare il dipendente autenticato.",
			"SESSION_MISSING"
		);
	}

	const employee = await fetchEmployeeByAuthUserId(supabase, user.id);
	debugEmployeeSession("Employee lookup after sign in", {
		userId: user.id,
		employee,
	});

	if (!employee) {
		await signOutAndClearSession(supabase);
		throw new EmployeeSessionError("Utente non autorizzato", "UNAUTHORIZED");
	}

	if (!employee.is_active) {
		await signOutAndClearSession(supabase);
		throw new EmployeeSessionError("Account disattivato", "INACTIVE");
	}

	markAdminSessionActivity();
	return employee;
}

export async function bootstrapEmployeeSession() {
	const supabase = getSupabaseBrowserClient();
	const { data } = await supabase.auth.getSession();
	return loadEmployeeForSession(supabase, data.session);
}
