"use client";

import { useState, type FormEvent } from "react";
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
	return <main className="mx-auto max-w-md px-4 py-12"><form onSubmit={submit} className="rounded-xl border bg-white p-6"><h1 className="text-2xl font-semibold">Nuova password</h1><label className="mt-5 block text-sm">Password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><button disabled={busy} className="mt-4 min-h-11 w-full rounded-lg bg-zinc-900 text-white">Salva password</button>{message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}</form></main>;
}
