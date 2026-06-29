import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type AppUser = User;

export class AuthSessionError extends Error {
	code: "INVALID_CREDENTIALS" | "SESSION_MISSING" | "UNKNOWN";

	constructor(
		message: string,
		code: "INVALID_CREDENTIALS" | "SESSION_MISSING" | "UNKNOWN"
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

export async function loadUserForSession(
	_supabase: SupabaseClient,
	session: Session | null
): Promise<AppUser | null> {
	return session?.user ?? null;
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

	if (!user) {
		await signOutAndClearSession(supabase);
		throw new AuthSessionError(
			"Impossibile recuperare l'utente autenticato.",
			"SESSION_MISSING"
		);
	}

	return user;
}

export async function bootstrapUserSession() {
	const supabase = getSupabaseBrowserClient();
	const { data } = await supabase.auth.getSession();
	return loadUserForSession(supabase, data.session);
}
