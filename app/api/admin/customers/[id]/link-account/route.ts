import { NextRequest, NextResponse } from "next/server";
import { getActiveEmployee } from "@/lib/admin-auth-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSameOriginRequest } from "@/lib/booking-security";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
	const employee = await getActiveEmployee();
	if (employee?.role !== "admin") return NextResponse.json({ error: "Solo l'amministratore può collegare i contatti." }, { status: 403 });
	try {
		const { id } = await context.params;
		const body = await request.json() as { email?: unknown };
		const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Inserisci l'email dell'account verificato." }, { status: 400 });
		const db = await createSupabaseServerClient();
		const { data: matches, error } = await db.rpc("find_customer_email_matches", { p_email: email });
		if (error) throw error;
		if (matches?.length !== 1 || !matches[0].auth_user_id) return NextResponse.json({ error: "Account cliente non trovato o ambiguo." }, { status: 409 });
		const { error: mergeError } = await db.rpc("merge_customer_bookings", { p_source: id, p_target: matches[0].id });
		if (mergeError) return NextResponse.json({ error: mergeError.message }, { status: 409 });
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Customer manual link error:", error);
		return NextResponse.json({ error: "Impossibile collegare il contatto." }, { status: 500 });
	}
}
