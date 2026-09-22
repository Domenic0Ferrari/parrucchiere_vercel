"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthSession } from "@/components/auth/employee-session-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { reviewSelect, type Review, type ReviewStatus } from "@/lib/reviews";

const filters: { value: ReviewStatus; label: string }[] = [
	{ value: "pending", label: "Da approvare" },
	{ value: "approved", label: "Approvate" },
	{ value: "rejected", label: "Rifiutate" },
];
const PAGE_SIZE = 30;

export default function AdminReviewsPage() {
	const { user } = useAuthSession();
	const [filter, setFilter] = useState<ReviewStatus>("pending");
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [refresh, setRefresh] = useState(0);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const isAdmin = user?.employee.role === "admin";

	useEffect(() => {
		if (!isAdmin) return;
		let active = true;
		void getSupabaseBrowserClient().from("reviews")
			.select(reviewSelect).eq("status", filter).order("created_at", { ascending: false }).order("id", { ascending: false })
			.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
			.then(({ data, error: queryError }) => {
				if (!active) return;
				if (queryError) setError("Impossibile caricare le recensioni. Verifica la configurazione Supabase.");
				else {
					const rows = (data ?? []) as Review[];
					setReviews((current) => page === 0 ? rows.slice(0, PAGE_SIZE) : [...current, ...rows.slice(0, PAGE_SIZE)]);
					setHasMore(rows.length > PAGE_SIZE);
				}
				setLoading(false);
			});
		return () => { active = false; };
	}, [filter, isAdmin, page, refresh]);

	const moderate = async (review: Review, status: "approved" | "rejected") => {
		setBusyId(review.id);
		const { data, error: updateError } = await getSupabaseBrowserClient().from("reviews")
			.update({ status }).eq("id", review.id).eq("status", "pending").select("id").maybeSingle();
		setBusyId(null);
		if (updateError || !data) {
			toast.error("Impossibile aggiornare la recensione. Ricarica la pagina e riprova.");
			return;
		}
		setReviews((current) => current.filter((item) => item.id !== review.id));
		setLoading(true);
		setPage(0);
		setRefresh((value) => value + 1);
		toast.success(status === "approved" ? "Recensione approvata." : "Recensione rifiutata.");
	};

	if (!isAdmin) return <p className="text-sm text-zinc-600">Questa sezione è riservata agli amministratori.</p>;

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold text-zinc-900">Recensioni</h1>
				<p className="mt-1 text-sm text-zinc-600">Approva o rifiuta le recensioni prima che appaiano sul sito.</p>
			</header>
			<div className="flex flex-wrap gap-2" role="group" aria-label="Filtra recensioni">
				{filters.map((item) => (
					<button key={item.value} type="button" aria-pressed={filter === item.value}
						onClick={() => { setLoading(true); setError(null); setPage(0); setFilter(item.value); setRefresh((value) => value + 1); }}
						className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === item.value ? "bg-brand text-white" : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"}`}>
						{item.label}
					</button>
				))}
			</div>
			{error ? (
				<div><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => { setLoading(true); setError(null); setRefresh((value) => value + 1); }} className="mt-3 text-sm font-semibold text-brand underline">Riprova</button></div>
			) : loading && page === 0 ? (
				<p className="text-sm text-zinc-600">Caricamento recensioni...</p>
			) : reviews.length === 0 ? (
				<p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Nessuna recensione in questa sezione.</p>
			) : (
				<>
					<div className="space-y-4">
						{reviews.map((review) => (
							<article key={review.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div><p className="font-semibold text-zinc-900">{review.author_name}</p><p className="text-xs text-zinc-500">{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(review.created_at))}</p></div>
									<span className="text-sm font-semibold text-brand" aria-label={`${review.rating} stelle su 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
								</div>
								<p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">{review.comment}</p>
								{filter === "pending" ? (
									<div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
										<button type="button" disabled={busyId !== null} onClick={() => void moderate(review, "approved")} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Approva</button>
										<button type="button" disabled={busyId !== null} onClick={() => void moderate(review, "rejected")} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60">Rifiuta</button>
									</div>
								) : review.moderated_at ? <p className="mt-4 text-xs text-zinc-500">Moderata il {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(review.moderated_at))}</p> : null}
							</article>
						))}
					</div>
					{hasMore ? <button type="button" disabled={loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60">{loading ? "Caricamento..." : "Mostra altre"}</button> : null}
				</>
			)}
		</section>
	);
}
