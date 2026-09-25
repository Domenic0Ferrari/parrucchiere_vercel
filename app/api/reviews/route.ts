import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumeRateLimit, isSameOriginRequest, rateLimitKey } from "@/lib/booking-security";

const MAX_BODY_BYTES = 8_192;

type ReviewInput = { name: string; rating: number; comment: string; turnstileToken: string };

function serviceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Configurazione Supabase mancante.");
	return createClient(url, key, { auth: { persistSession: false } });
}

function jsonError(error: string, status: number, headers?: HeadersInit) {
	return NextResponse.json({ error }, { status, headers });
}

async function readBody(request: NextRequest) {
	if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("UNSUPPORTED_MEDIA_TYPE");
	const declaredLength = Number(request.headers.get("content-length") ?? 0);
	if (declaredLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
	const raw = await request.text();
	if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
	return JSON.parse(raw) as unknown;
}

function parseInput(body: unknown): ReviewInput | null {
	if (!body || typeof body !== "object" || Array.isArray(body)) return null;
	const data = body as Record<string, unknown>;
	const name = typeof data.name === "string" ? data.name.trim() : "";
	const comment = typeof data.comment === "string" ? data.comment.trim() : "";
	const rating = data.rating;
	const turnstileToken = typeof data.turnstileToken === "string" ? data.turnstileToken.trim() : "";
	if (name.length < 2 || name.length > 80 || comment.length < 10 || comment.length > 2_000 || typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5 || !turnstileToken) return null;
	return { name, rating, comment, turnstileToken };
}

async function verifyTurnstile(token: string) {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) return "unconfigured" as const;
	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ secret, response: token }).toString(),
			cache: "no-store",
		});
		const result = await response.json() as { success?: unknown };
		return result.success === true ? "valid" as const : "invalid" as const;
	} catch {
		return "unavailable" as const;
	}
}

export async function POST(request: NextRequest) {
	if (!isSameOriginRequest(request)) return jsonError("Origine non consentita.", 403);
	try {
		const input = parseInput(await readBody(request));
		if (!input) return jsonError("Dati della recensione non validi.", 400);

		const db = serviceClient();
		const rateLimit = await consumeRateLimit(db, rateLimitKey(request, "reviews"), 3, 10 * 60);
		if (rateLimit === "blocked") return jsonError("Hai inviato troppe recensioni. Riprova più tardi.", 429, { "Retry-After": "600" });
		if (rateLimit === "unavailable") return jsonError("Invio recensioni temporaneamente non disponibile.", 503, { "Retry-After": "30" });

		const turnstile = await verifyTurnstile(input.turnstileToken);
		if (turnstile === "unconfigured") return jsonError("Protezione recensioni non configurata.", 503);
		if (turnstile === "unavailable") return jsonError("Impossibile verificare la protezione. Riprova tra poco.", 503);
		if (turnstile === "invalid") return jsonError("Verifica di sicurezza non valida. Riprova.", 400);

		const { error } = await db.from("reviews").insert({ author_name: input.name, rating: input.rating, comment: input.comment });
		if (error) throw error;
		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (error) {
		if (error instanceof SyntaxError) return jsonError("JSON non valido.", 400);
		if (error instanceof Error && error.message === "UNSUPPORTED_MEDIA_TYPE") return jsonError("Invia la richiesta come application/json.", 415);
		if (error instanceof Error && error.message === "BODY_TOO_LARGE") return jsonError("Richiesta troppo grande.", 413);
		console.error("Review submission error:", error);
		return jsonError("Invio recensione non riuscito. Riprova più tardi.", 500);
	}
}
