import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function client() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Configurazione del salone mancante.");
	return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
	try {
		const { data, error } = await client()
			.from("salon")
			.select("name, email, phone, address")
			.order("created_at", { ascending: true })
			.limit(1)
			.maybeSingle();

		if (error) throw error;
		return NextResponse.json({
			salon: data
				? {
					name: data.name ? String(data.name) : "",
					email: data.email ? String(data.email) : "",
					phone: data.phone ? String(data.phone) : "",
					address: data.address ? String(data.address) : "",
				}
				: null,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Impossibile caricare i contatti.";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
