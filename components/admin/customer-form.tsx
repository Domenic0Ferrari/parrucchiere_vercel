"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const ERROR_VISIBILITY_MS = 3000;

type CustomerData = {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	note: string | null;
};

type CustomerFormProps = {
	customer: CustomerData | null;
};

type FieldErrors = {
	name?: string;
};

function nullableTrimmed(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function CustomerForm({ customer }: CustomerFormProps) {
	const router = useRouter();
	const isEdit = customer !== null;

	const [name, setName] = useState(customer?.name ?? "");
	const [phone, setPhone] = useState(customer?.phone ?? "");
	const [email, setEmail] = useState(customer?.email ?? "");
	const [note, setNote] = useState(customer?.note ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	useEffect(() => {
		setName(customer?.name ?? "");
		setPhone(customer?.phone ?? "");
		setEmail(customer?.email ?? "");
		setNote(customer?.note ?? "");
	}, [customer]);

	useEffect(() => {
		if (Object.keys(fieldErrors).length === 0) return;
		const timeout = window.setTimeout(() => setFieldErrors({}), ERROR_VISIBILITY_MS);
		return () => window.clearTimeout(timeout);
	}, [fieldErrors]);

	const ensureSession = async (): Promise<boolean> => {
		const supabase = getSupabaseBrowserClient();
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			toast.error("Sessione non valida. Effettua di nuovo il login.", {
				duration: ERROR_VISIBILITY_MS,
			});
			router.replace(
				`/login?next=${encodeURIComponent(`/admin/customers/${isEdit ? customer!.id : "new"}`)}`
			);
			return false;
		}

		return true;
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) return;

		const normalizedName = name.trim();
		if (!normalizedName) {
			setFieldErrors({ name: "Inserisci un nome." });
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			if (!(await ensureSession())) return;

			const payload = {
				name: normalizedName,
				phone: nullableTrimmed(phone),
				email: nullableTrimmed(email),
				note: nullableTrimmed(note),
			};

			const supabase = getSupabaseBrowserClient();

			if (isEdit && customer) {
				const { error } = await supabase
					.from("customers")
					.update(payload)
					.eq("id", customer.id);

				if (error) {
					toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}

				toast.success("Cliente aggiornato correttamente.");
			} else {
				const { error } = await supabase.from("customers").insert({
					...payload,
					is_active: true,
				});

				if (error) {
					toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}

				toast.success("Cliente creato correttamente.");
			}

			router.push("/admin/customers");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Errore imprevisto durante il salvataggio.",
				{ duration: ERROR_VISIBILITY_MS }
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardContent className="pt-6">
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label
							className="mb-1.5 block text-sm font-semibold text-zinc-900"
							htmlFor="customer-name"
						>
							Nome
						</label>
						<input
							id="customer-name"
							name="name"
							type="text"
							className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
								fieldErrors.name ? "border-red-500" : "border-zinc-300"
							}`}
							value={name}
							onChange={(event) => {
								setName(event.target.value);
								if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: undefined }));
							}}
						/>
						{fieldErrors.name ? (
							<p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
						) : null}
					</div>

					<div>
						<label
							className="mb-1.5 block text-sm font-semibold text-zinc-900"
							htmlFor="customer-phone"
						>
							Telefono
						</label>
						<input
							id="customer-phone"
							name="phone"
							type="tel"
							className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
						/>
					</div>

					<div>
						<label
							className="mb-1.5 block text-sm font-semibold text-zinc-900"
							htmlFor="customer-email"
						>
							Email
						</label>
						<input
							id="customer-email"
							name="email"
							type="email"
							className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>

					<div>
						<label
							className="mb-1.5 block text-sm font-semibold text-zinc-900"
							htmlFor="customer-note"
						>
							Note
						</label>
						<textarea
							id="customer-note"
							name="note"
							rows={4}
							className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
							value={note}
							onChange={(event) => setNote(event.target.value)}
						/>
					</div>

					<div className="flex flex-wrap justify-end gap-3 pt-2">
						<Link href="/admin/customers">
							<Button type="button" variant="outline" disabled={isSubmitting}>
								Annulla
							</Button>
						</Link>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Salva"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
