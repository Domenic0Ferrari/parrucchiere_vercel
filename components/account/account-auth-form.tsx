"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
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
	const title = recovery ? "Recupera la password" : mode === "register" ? "Crea il tuo account" : "Bentornato";
	const subtitle = recovery ? "Ti invieremo un link sicuro per scegliere una nuova password." : mode === "register" ? "Crea un profilo per avere le prenotazioni sempre a portata di mano." : "Accedi per vedere e gestire i tuoi appuntamenti.";
	return <main className="mx-auto grid min-h-[calc(100dvh-var(--navbar-height))] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-14"><section className="order-2 rounded-3xl bg-zinc-900 p-7 text-white shadow-sm lg:order-1 lg:p-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">Area clienti</p><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">I tuoi appuntamenti, sempre con te.</h1><p className="mt-4 max-w-md leading-7 text-zinc-300">Consulta lo storico, tieni sotto controllo le prossime prenotazioni e gestiscile in autonomia quando possibile.</p><div className="mt-8 space-y-4"><div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10"><ShieldCheck className="size-5" /></span><p className="pt-1 text-sm text-zinc-200">Accesso protetto tramite email e password.</p></div><div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10"><KeyRound className="size-5" /></span><p className="pt-1 text-sm text-zinc-200">Modifica o annulla fino a 24 ore prima dell&apos;appuntamento.</p></div></div></section><section className="order-1 w-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 lg:order-2">
		<p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Area clienti</p>
		<h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{subtitle}</p>
		<form onSubmit={submit} className="mt-7 space-y-4">
			{mode === "register" && !recovery ? <label className="block text-sm font-medium">Nome e cognome<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label> : null}
			<label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label>
			{!recovery ? <label className="block text-sm font-medium">Password<input required minLength={mode === "register" ? 8 : undefined} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label> : null}
			<button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50">{busy ? "Attendi..." : recovery ? "Invia il link" : mode === "register" ? "Crea account" : "Accedi"}<ArrowRight className="size-4" /></button>
		</form>
		{message ? <p role="status" className="mt-4 text-sm text-zinc-700">{message}</p> : null}
		<div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
			{mode === "login" && !recovery ? <button type="button" onClick={() => { setRecovery(true); setMessage(""); }} className="underline">Password dimenticata?</button> : null}
			{recovery ? <button type="button" onClick={() => { setRecovery(false); setMessage(""); }} className="underline">Torna al login</button> : <Link className="underline" href={mode === "register" ? "/account/login" : "/account/register"}>{mode === "register" ? "Hai già un account?" : "Crea un account"}</Link>}
		</div>
	</section></main>;
}
