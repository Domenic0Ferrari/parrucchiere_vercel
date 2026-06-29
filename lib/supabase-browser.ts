import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
	if (browserClient) {
		return browserClient;
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			"Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
		);
	}

	browserClient = createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			autoRefreshToken: true,
			detectSessionInUrl: true,
			persistSession: true,
			// Keep browser sessions stable across reloads and client instances.
			storageKey: "parrucchiere.supabase.auth",
		},
	});
	return browserClient;
}
