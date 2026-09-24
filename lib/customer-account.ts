import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type CustomerAccount = { id: string; name: string; email: string; phone: string | null; authUserId: string };

export function customerPortalMode() {
	const mode = process.env.CUSTOMER_PORTAL_MODE;
	return mode === "test" || mode === "live" ? mode : "off";
}

export function customerEmailAllowed(email: string) {
	const mode = customerPortalMode();
	if (mode === "off") return false;
	if (mode === "live") return true;
	return email.toLowerCase() === process.env.CUSTOMER_PORTAL_TEST_EMAIL?.trim().toLowerCase();
}

export function serviceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Configurazione Supabase mancante.");
	return createClient(url, key, { auth: { persistSession: false } });
}

export class CustomerAccountError extends Error {
	constructor(message: string, public status: number) { super(message); }
}

export async function getCustomerAccount(): Promise<CustomerAccount> {
	if (customerPortalMode() === "off") throw new CustomerAccountError("Area clienti non ancora disponibile.", 503);
	const auth = await createSupabaseServerClient();
	const { data: { user }, error } = await auth.auth.getUser();
	if (error || !user) throw new CustomerAccountError("Accedi per vedere le tue prenotazioni.", 401);
	const email = user.email?.trim().toLowerCase();
	if (!email || !user.email_confirmed_at) throw new CustomerAccountError("Verifica la tua email prima di accedere.", 403);
	if (!customerEmailAllowed(email)) throw new CustomerAccountError("Area clienti in fase di test.", 403);

	const db = serviceClient();
	const { data: linked, error: linkedError } = await db.from("customers")
		.select("id, name, email, phone, auth_user_id, is_active")
		.eq("auth_user_id", user.id).maybeSingle();
	if (linkedError) throw linkedError;
	if (linked) {
		if (!linked.is_active) throw new CustomerAccountError("Contatta il salone per riattivare il profilo.", 403);
		return { id: linked.id, name: linked.name, email, phone: linked.phone, authUserId: user.id };
	}

	const { data: matches, error: matchError } = await db.rpc("find_customer_email_matches", { p_email: email });
	if (matchError) throw matchError;
	if ((matches?.length ?? 0) > 1 || matches?.[0]?.auth_user_id) {
		throw new CustomerAccountError("Contatta il salone per collegare le prenotazioni al tuo account.", 409);
	}
	if (matches?.[0]) {
		const match = matches[0];
		const { data, error: linkError } = await db.from("customers")
			.update({ auth_user_id: user.id })
			.eq("id", match.id).is("auth_user_id", null)
			.select("id, name, phone").single();
		if (!linkError && data) return { id: data.id, name: data.name, email, phone: data.phone, authUserId: user.id };
	} else {
		const name = typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
			? user.user_metadata.name.trim().slice(0, 100) : email.split("@")[0];
		const { data, error: insertError } = await db.from("customers")
			.insert({ name, email, phone: null, auth_user_id: user.id, is_active: true })
			.select("id, name, phone").single();
		if (!insertError && data) return { id: data.id, name: data.name, email, phone: data.phone, authUserId: user.id };
	}
	// A concurrent request may have linked the account first.
	const { data: retry } = await db.from("customers").select("id, name, phone, is_active")
		.eq("auth_user_id", user.id).maybeSingle();
	if (retry?.is_active) return { id: retry.id, name: retry.name, email, phone: retry.phone, authUserId: user.id };
	throw new CustomerAccountError("Impossibile collegare il profilo. Contatta il salone.", 409);
}
