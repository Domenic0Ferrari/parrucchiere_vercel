import { NextRequest, NextResponse } from "next/server";
import { customerEmailAllowed } from "@/lib/customer-account";
import { isSameOriginRequest } from "@/lib/booking-security";

export async function POST(request: NextRequest) {
	if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
	try {
		const body = await request.json() as { email?: unknown };
		const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Email non valida." }, { status: 400 });
		if (!customerEmailAllowed(email)) return NextResponse.json({ error: "Registrazione clienti non ancora disponibile." }, { status: 403 });
		return NextResponse.json({ ok: true });
	} catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
}
