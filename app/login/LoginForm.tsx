"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const ERROR_VISIBILITY_MS = 3000;

export default function OwnerLoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});
	const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
		"idle"
	);
	const [message, setMessage] = useState<string | null>(null);
	const [checkingSession, setCheckingSession] = useState(true);

	useEffect(() => {
		let mounted = true;
		const supabase = getSupabaseBrowserClient();

		const bootstrap = async () => {
			const { data } = await supabase.auth.getSession();
			if (!mounted) {
				return;
			}

			if (data.session) {
				const next = searchParams.get("next") || "/admin/dashboard";
				router.replace(next);
				return;
			}

			setCheckingSession(false);
		};

		void bootstrap();

		return () => {
			mounted = false;
		};
	}, [router, searchParams]);

	useEffect(() => {
		if (status !== "error") {
			return;
		}

		const hasFieldErrors = Boolean(fieldErrors.email || fieldErrors.password);
		if (!message && !hasFieldErrors) {
			setStatus("idle");
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setFieldErrors({});
			setMessage(null);
			setStatus("idle");
		}, ERROR_VISIBILITY_MS);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [fieldErrors.email, fieldErrors.password, message, status]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextFieldErrors: { email?: string; password?: string } = {};
		if (!email.trim()) {
			nextFieldErrors.email = "Inserisci un indirizzo email valido.";
		}
		if (!password.trim()) {
			nextFieldErrors.password = "Inserisci una password valida.";
		}
		if (Object.keys(nextFieldErrors).length > 0) {
			setFieldErrors(nextFieldErrors);
			setStatus("error");
			setMessage(null);
			return;
		}

		setFieldErrors({});
		setStatus("loading");
		setMessage(null);

		try {
			const supabase = getSupabaseBrowserClient();
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				setStatus("error");
				setMessage(null);
				toast.error("Credenziali non valide. Riprova.");
				return;
			}

			setStatus("success");
			setMessage("Login effettuato con successo.");
			const next = searchParams.get("next") || "/admin/dashboard";
			router.push(next);
		} catch (err) {
			setStatus("error");
			setMessage(null);
			toast.error(
				err instanceof Error ? err.message : "Errore imprevisto durante il login."
			);
		}
	};

	if (checkingSession) {
		return (
			<section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
				<p className="text-sm text-zinc-600">Controllo sessione in corso...</p>
			</section>
		);
	}

	return (
		<section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
			<p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
				Area Riservata
			</p>
			<h1 className="mt-2 text-2xl font-semibold text-zinc-900">
				Login
			</h1>

			<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
				<div>
					<label
						htmlFor="owner-email"
						className="mb-1.5 block text-sm font-semibold text-zinc-900"
					>
						Email
					</label>
					<input
						id="owner-email"
						name="email"
						type="email"
						autoComplete="username"
						placeholder="owner@salone.it"
						className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
							fieldErrors.email ? "border-red-500" : "border-zinc-300"
						}`}
						value={email}
						onChange={(event) => {
							setEmail(event.target.value);
							if (fieldErrors.email) {
								setFieldErrors((current) => ({ ...current, email: undefined }));
							}
							if (status === "error") {
								setMessage(null);
							}
						}}
						aria-invalid={Boolean(fieldErrors.email)}
						aria-describedby={fieldErrors.email ? "owner-email-error" : undefined}
					/>
					{fieldErrors.email ? (
						<p id="owner-email-error" className="mt-1 text-sm text-red-600">
							{fieldErrors.email}
						</p>
					) : null}
				</div>

				<div>
					<label
						htmlFor="owner-password"
						className="mb-1.5 block text-sm font-semibold text-zinc-900"
					>
						Password
					</label>
					<input
						id="owner-password"
						name="password"
						type="password"
						autoComplete="current-password"
						placeholder="Inserisci la password"
						className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
							fieldErrors.password ? "border-red-500" : "border-zinc-300"
						}`}
						value={password}
						onChange={(event) => {
							setPassword(event.target.value);
							if (fieldErrors.password) {
								setFieldErrors((current) => ({ ...current, password: undefined }));
							}
							if (status === "error") {
								setMessage(null);
							}
						}}
						aria-invalid={Boolean(fieldErrors.password)}
						aria-describedby={fieldErrors.password ? "owner-password-error" : undefined}
					/>
					{fieldErrors.password ? (
						<p id="owner-password-error" className="mt-1 text-sm text-red-600">
							{fieldErrors.password}
						</p>
					) : null}
				</div>

				<button
					type="submit"
					disabled={status === "loading"}
					className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{status === "loading" ? "Accesso in corso..." : "Accedi"}
				</button>

				{message && status !== "error" ? (
					<p
						className={`text-sm ${
							status === "error" ? "text-red-600" : "text-emerald-600"
						}`}
					>
						{message}
					</p>
				) : null}
			</form>
		</section>
	);
}
