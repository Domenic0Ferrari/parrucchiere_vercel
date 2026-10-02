"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetCustomerPasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(event: FormEvent) {
		event.preventDefault(); setBusy(true); setMessage("");
		try {
			if (password.length < 8) throw new Error("La password deve avere almeno 8 caratteri.");
			const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
			if (error) throw error;
			router.replace("/account/bookings"); router.refresh();
		} catch (error) { setMessage(error instanceof Error ? error.message : "Impossibile aggiornare la password."); }
		finally { setBusy(false); }
	}
	return <main className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50 px-4 py-10 sm:px-6 sm:py-14"><form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Area clienti</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Nuova password</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Scegli una password di almeno 8 caratteri per tornare alla tua area riservata.</p><label className="mt-7 block text-sm font-semibold text-zinc-800">Password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="app-input mt-2" /></label><button disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Salvataggio..." : "Salva password"}</button>{message ? <p role="status" className="mt-4 text-sm text-zinc-700">{message}</p> : null}<Link href="/account/login" className="mt-5 inline-flex text-sm font-semibold text-brand underline underline-offset-2">Torna al login</Link></form></main>;
}
