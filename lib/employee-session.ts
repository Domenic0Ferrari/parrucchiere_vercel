import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type EmployeeProfile = {
	id: string;
	auth_user_id: string;
	name: string;
	is_active: boolean;
	role: string;
};

export type AppUser = {
	auth: User;
	employee: EmployeeProfile;
};

export class AuthSessionError extends Error {
	code:
		| "INVALID_CREDENTIALS"
		| "SESSION_MISSING"
		| "ACCESS_DENIED"
		| "INACTIVE_EMPLOYEE"
		| "UNKNOWN";

	constructor(
		message: string,
		code:
			| "INVALID_CREDENTIALS"
			| "SESSION_MISSING"
			| "ACCESS_DENIED"
			| "INACTIVE_EMPLOYEE"
			| "UNKNOWN"
	) {
		super(message);
		this.name = "AuthSessionError";
		this.code = code;
	}
}

function debugAuthSession(message: string, payload?: unknown) {
	if (process.env.NODE_ENV === "production") {
		return;
	}

	if (typeof payload === "undefined") {
		console.log(`[auth-session] ${message}`);
		return;
	}

	console.log(`[auth-session] ${message}`, payload);
}

async function signOutAndClearSession(supabase: SupabaseClient) {
	await supabase.auth.signOut();
}

async function loadEmployeeProfile(
	supabase: SupabaseClient,
	authUserId: string
): Promise<EmployeeProfile> {
	const { data: employee, error } = await supabase
		.from("employees")
		.select("id, auth_user_id, name, is_active, role")
		.eq("auth_user_id", authUserId)
		.maybeSingle();

	if (error) {
		debugAuthSession("Employee profile query failed", {
			authUserId,
			error,
		});
		await signOutAndClearSession(supabase);
		throw new AuthSessionError(
			"Impossibile verificare il profilo dipendente.",
			"UNKNOWN"
		);
	}

	if (!employee) {
		debugAuthSession("Employee profile not found", { authUserId });
		await signOutAndClearSession(supabase);
		throw new AuthSessionError(
			"Il tuo account non è abilitato all'accesso.",
			"ACCESS_DENIED"
		);
	}

	if (employee.is_active !== true) {
		debugAuthSession("Employee profile inactive", {
			authUserId,
			employeeId: employee.id,
		});
		await signOutAndClearSession(supabase);
		throw new AuthSessionError(
			"Il tuo account è stato disattivato. Contatta l'amministratore.",
			"INACTIVE_EMPLOYEE"
		);
	}

	return employee;
}

export async function loadUserForSession(
	supabase: SupabaseClient,
	session: Session | null
): Promise<AppUser | null> {
	if (!session?.user) {
		return null;
	}

	try {
		const employee = await loadEmployeeProfile(supabase, session.user.id);
		return { auth: session.user, employee };
	} catch (error) {
		if (error instanceof AuthSessionError) {
			throw error;
		}

		debugAuthSession("Unexpected error loading employee profile", error);
		await signOutAndClearSession(supabase);
		throw new AuthSessionError(
			"Impossibile verificare il profilo dipendente.",
			"UNKNOWN"
		);
	}
}

export async function signInUser(
	email: string,
	password: string
): Promise<AppUser> {
	const supabase = getSupabaseBrowserClient();

	const { data, error: signInError } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (signInError) {
		debugAuthSession("Supabase signInWithPassword failed", {
			email,
			error: signInError,
		});
		throw new AuthSessionError(
			"Credenziali non valide. Riprova.",
			"INVALID_CREDENTIALS"
		);
	}

	const user = data.user ?? data.session?.user;
	debugAuthSession("Supabase signInWithPassword success", {
		email,
		userId: user?.id ?? null,
		hasSession: Boolean(data.session),
	});

	if (data.session) {
		await supabase.auth.setSession({
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
		});
	}

	if (!user || !data.session) {
		await signOutAndClearSession(supabase);
		throw new AuthSessionError(
			"Impossibile recuperare l'utente autenticato.",
			"SESSION_MISSING"
		);
	}

	const appUser = await loadUserForSession(supabase, data.session);
	if (!appUser) {
		await signOutAndClearSession(supabase);
		throw new AuthSessionError(
			"Impossibile recuperare l'utente autenticato.",
			"SESSION_MISSING"
		);
	}

	return appUser;
}

export async function bootstrapUserSession() {
	const supabase = getSupabaseBrowserClient();
	const { data } = await supabase.auth.getSession();
	return loadUserForSession(supabase, data.session);
}
