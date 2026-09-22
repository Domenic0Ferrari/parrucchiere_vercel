"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { reviewSelect, type Review } from "@/lib/reviews";
import ReviewCard from "./review-card";

export default function ReviewsPreview() {
	const [reviews, setReviews] = useState<Review[]>([]);
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		void getSupabaseBrowserClient().from("reviews").select(reviewSelect)
			.eq("status", "approved").order("created_at", { ascending: false }).limit(3)
			.then(({ data, error: queryError }) => {
				if (!active) return;
				setError(Boolean(queryError));
				setReviews((data ?? []) as Review[]);
				setLoading(false);
			});
		return () => { active = false; };
	}, []);

	return (
		<section className="mx-auto max-w-[1440px] px-6 py-12 sm:px-10 sm:py-16 lg:px-12 xl:px-16" aria-labelledby="reviews-heading">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">La voce dei clienti</p>
					<h2 id="reviews-heading" className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">Le vostre recensioni</h2>
				</div>
				<Link href="/reviews" className="text-sm font-semibold text-brand hover:underline">Leggi tutte le recensioni →</Link>
			</div>
			{reviews.length > 0 ? (
				<div className="mt-6 grid gap-4 md:grid-cols-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
			) : (
				<p className="mt-6 text-sm text-zinc-600">{loading ? "Caricamento recensioni..." : error ? "Le recensioni non sono disponibili al momento." : "Non ci sono ancora recensioni pubblicate."}</p>
			)}
			<Link href="/reviews/new" className="mt-6 inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover">Scrivi una recensione</Link>
		</section>
	);
}
