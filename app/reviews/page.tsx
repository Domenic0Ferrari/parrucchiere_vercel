"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReviewCard from "@/components/reviews/review-card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { reviewSelect, type Review } from "@/lib/reviews";

const PAGE_SIZE = 12;

export default function ReviewsPage() {
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = async (offset: number) => {
		const { data, error: queryError } = await getSupabaseBrowserClient().from("reviews")
			.select(reviewSelect).eq("status", "approved")
			.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + PAGE_SIZE);
		if (queryError) throw queryError;
		const rows = (data ?? []) as Review[];
		setReviews((current) => offset === 0 ? rows.slice(0, PAGE_SIZE) : [...current, ...rows.slice(0, PAGE_SIZE)]);
		setHasMore(rows.length > PAGE_SIZE);
	};

	useEffect(() => {
		void load(0).catch(() => setError("Impossibile caricare le recensioni. Riprova più tardi."))
			.finally(() => setLoading(false));
	}, []);

	const loadMore = async () => {
		setLoadingMore(true);
		setError(null);
		try { await load(reviews.length); }
		catch { setError("Impossibile caricare altre recensioni. Riprova."); }
		finally { setLoadingMore(false); }
	};

	return (
		<main className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 px-4 py-10 sm:px-6 sm:py-14">
			<div className="mx-auto max-w-5xl">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">La voce dei clienti</p><h1 className="mt-2 text-3xl font-semibold text-zinc-900 sm:text-4xl">Recensioni</h1><p className="mt-3 text-sm text-zinc-600">Le esperienze condivise dai nostri clienti.</p></div>
					<Link href="/reviews/new" className="inline-flex justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover">Scrivi una recensione</Link>
				</div>
				{loading ? <p className="mt-10 text-sm text-zinc-600">Caricamento recensioni...</p> : reviews.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : !error ? <p className="mt-10 text-sm text-zinc-600">Non ci sono ancora recensioni pubblicate. Puoi essere il primo a scriverne una.</p> : null}
				{error ? <p role="alert" className="mt-6 text-sm text-red-700">{error}</p> : null}
				{hasMore ? <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="mt-8 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60">{loadingMore ? "Caricamento..." : "Mostra altre recensioni"}</button> : null}
			</div>
		</main>
	);
}
