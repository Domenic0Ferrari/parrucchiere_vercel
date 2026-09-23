import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = "allowed" | "blocked" | "unavailable";

function requestAddress(request: NextRequest) {
	const forwarded = request.headers.get("x-vercel-forwarded-for")
		?? request.headers.get("x-forwarded-for")
		?? request.headers.get("x-real-ip")
		?? "unknown";
	return forwarded.split(",")[0]?.trim() || "unknown";
}

export function rateLimitKey(request: NextRequest, scope: string) {
	const secret = process.env.BOOKING_RATE_LIMIT_SECRET
		?? process.env.SUPABASE_SERVICE_ROLE_KEY
		?? "booking-rate-limit";
	return createHmac("sha256", secret)
		.update(`${scope}:${requestAddress(request)}`)
		.digest("hex");
}

export async function consumeRateLimit(
	supabase: SupabaseClient,
	key: string,
	limit: number,
	windowSeconds: number
): Promise<RateLimitResult> {
	const { data, error } = await supabase.rpc("consume_booking_rate_limit", {
		p_key: key,
		p_limit: limit,
		p_window_seconds: windowSeconds,
	});

	if (error) {
		console.error("Booking rate limit unavailable:", error.message);
		return "unavailable";
	}
	return data === true ? "allowed" : "blocked";
}

export function isSameOriginRequest(request: NextRequest) {
	const fetchSite = request.headers.get("sec-fetch-site");
	if (fetchSite === "cross-site") return false;
	const origin = request.headers.get("origin");
	return !origin || origin === request.nextUrl.origin;
}
