"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AccountAuthForm({ mode }: { mode: "login" | "register" }) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [recovery, setRecovery] = useState(false);
	async function submit(event: FormEvent) {
		event.preventDefault(); setBusy(true); setMessage("");
		try {
			const auth = getSupabaseBrowserClient();
			const normalized = email.trim().toLowerCase();
			if (recovery) {
				const { error } = await auth.auth.resetPasswordForEmail(normalized, { redirectTo: `${window.location.origin}/account/confirm?next=/account/reset-password` });
				if (error) throw error;
				setMessage("Se l'indirizzo è registrato, riceverai un link per reimpostare la password.");
			} else if (mode === "register") {
				if (name.trim().length < 2 || password.length < 8) throw new Error("Inserisci il nome e una password di almeno 8 caratteri.");
				const check = await fetch("/api/account/registration-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalized }) });
				if (!check.ok) throw new Error((await check.json()).error ?? "Registrazione non disponibile.");
				const { error } = await auth.auth.signUp({ email: normalized, password, options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/account/confirm` } });
				if (error) throw error;
				setMessage("Controlla la tua email e conferma l'account prima di accedere.");
			} else {
				const { error } = await auth.auth.signInWithPassword({ email: normalized, password });
				if (error) throw new Error("Email o password non corrette.");
				router.replace("/account/bookings"); router.refresh();
			}
		} catch (error) { setMessage(error instanceof Error ? error.message : "Operazione non riuscita."); }
		finally { setBusy(false); }
	}
	return <main className="mx-auto flex min-h-[75dvh] max-w-md items-center px-4 py-10"><section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
		<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Area clienti</p>
		<h1 className="mt-2 text-2xl font-semibold">{recovery ? "Recupera la password" : mode === "register" ? "Crea il tuo account" : "Accedi"}</h1>
		<form onSubmit={submit} className="mt-6 space-y-4">
			{mode === "register" && !recovery ? <label className="block text-sm font-medium">Nome e cognome<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label> : null}
			<label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label>
			{!recovery ? <label className="block text-sm font-medium">Password<input required minLength={mode === "register" ? 8 : undefined} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label> : null}
			<button disabled={busy} className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 font-semibold text-white disabled:opacity-50">{busy ? "Attendi..." : recovery ? "Invia il link" : mode === "register" ? "Registrati" : "Accedi"}</button>
		</form>
		{message ? <p role="status" className="mt-4 text-sm text-zinc-700">{message}</p> : null}
		<div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
			{mode === "login" && !recovery ? <button type="button" onClick={() => { setRecovery(true); setMessage(""); }} className="underline">Password dimenticata?</button> : null}
			{recovery ? <button type="button" onClick={() => { setRecovery(false); setMessage(""); }} className="underline">Torna al login</button> : <Link className="underline" href={mode === "register" ? "/account/login" : "/account/register"}>{mode === "register" ? "Hai già un account?" : "Crea un account"}</Link>}
		</div>
	</section></main>;
}
