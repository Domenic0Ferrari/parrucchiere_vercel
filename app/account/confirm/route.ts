import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get("code");
	const tokenHash = request.nextUrl.searchParams.get("token_hash");
	const type = request.nextUrl.searchParams.get("type");
	const next = request.nextUrl.searchParams.get("next") === "/account/reset-password" ? "/account/reset-password" : "/account/bookings";
	const supabase = await createSupabaseServerClient();
	let error: unknown;
	if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
	else if (tokenHash && (type === "email" || type === "recovery")) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
	else error = new Error("Link non valido");
	return NextResponse.redirect(new URL(error ? "/account/login?error=link" : next, request.url));
}
