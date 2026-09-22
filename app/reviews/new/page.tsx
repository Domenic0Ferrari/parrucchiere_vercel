"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function NewReviewPage() {
	const [name, setName] = useState("");
	const [comment, setComment] = useState("");
	const [rating, setRating] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const cleanName = name.trim();
		const cleanComment = comment.trim();
		if (cleanName.length < 2 || cleanName.length > 80 || cleanComment.length < 10 || cleanComment.length > 2000 || rating < 1 || rating > 5) {
			setError("Inserisci nome (2–80 caratteri), voto e recensione (10–2000 caratteri).");
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const { error: insertError } = await getSupabaseBrowserClient().from("reviews").insert({ author_name: cleanName, rating, comment: cleanComment });
			if (insertError) throw insertError;
			setSubmitted(true);
		} catch {
			setError("Invio non riuscito. Riprova tra poco.");
		} finally { setSubmitting(false); }
	};

	return (
		<main className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 px-4 py-10 sm:px-6 sm:py-14">
			<div className="mx-auto max-w-2xl">
				<Link href="/reviews" className="text-sm font-medium text-brand hover:underline">← Torna alle recensioni</Link>
				<div className="mt-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
					{submitted ? <div role="status"><h1 className="text-2xl font-semibold text-zinc-900">Grazie per la tua recensione!</h1><p className="mt-3 text-sm leading-relaxed text-zinc-600">L’abbiamo ricevuta. Sarà visibile dopo l’approvazione.</p><Link href="/reviews" className="mt-6 inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover">Torna alle recensioni</Link></div> : <>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">La tua esperienza</p>
						<h1 className="mt-2 text-3xl font-semibold text-zinc-900">Scrivi una recensione</h1>
						<p className="mt-3 text-sm text-zinc-600">Racconta la tua esperienza nel salone. Nome, voto e testo saranno visibili sul sito dopo l’approvazione dell’amministratore.</p>
						<form onSubmit={(event) => void submit(event)} className="mt-7 space-y-6">
							<div><label htmlFor="review-name" className="block text-sm font-semibold text-zinc-900">Nome da mostrare</label><input id="review-name" type="text" required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-zinc-900 outline-none focus:border-brand" /></div>
							<fieldset><legend className="text-sm font-semibold text-zinc-900">Valutazione</legend><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} ${value === 1 ? "stella" : "stelle"}`} aria-pressed={rating === value} className="rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand"><Star className={`size-7 ${value <= rating ? "fill-brand text-brand" : "text-zinc-300"}`} /></button>)}</div>{rating === 0 ? <p className="mt-1 text-xs text-zinc-500">Seleziona da 1 a 5 stelle</p> : null}</fieldset>
							<div><label htmlFor="review-comment" className="block text-sm font-semibold text-zinc-900">La tua recensione</label><textarea id="review-comment" required minLength={10} maxLength={2000} rows={6} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-3 text-zinc-900 outline-none focus:border-brand" placeholder="Come ti sei trovato?" /><p className="mt-1 text-xs text-zinc-500">Da 10 a 2000 caratteri</p></div>
							{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
							<button type="submit" disabled={submitting || rating === 0} className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">{submitting ? "Invio in corso..." : "Invia recensione"}</button>
						</form>
					</>}
				</div>
			</div>
		</main>
	);
}
