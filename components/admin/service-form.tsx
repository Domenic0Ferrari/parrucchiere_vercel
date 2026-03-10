"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const ERROR_VISIBILITY_MS = 3000;

type ServiceData = {
	id: string;
	name: string;
	description: string;
	price: number;
	durationMinutes: number;
};

type ServiceFormProps = {
	service: ServiceData | null;
};

function buildInsertPayloads(input: { name: string; description: string; duration: number; price: number }) {
	return [
		{ name: input.name, description: input.description, duration_minutes: input.duration, price: input.price },
		{ name: input.name, description: input.description, duration: input.duration, price: input.price },
		{ name: input.name, description: input.description, duration: input.duration, price: input.price },
	];
}

export function ServiceForm({ service }: ServiceFormProps) {
	const router = useRouter();
	const isEdit = service !== null;

	const [name, setName] = useState(service?.name ?? "");
	const [description, setDescription] = useState(service?.description ?? "");
	const [duration, setDuration] = useState(service ? String(service.durationMinutes) : "");
	const [cost, setCost] = useState(service && service.price > 0 ? String(service.price) : "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{
		name?: string;
		description?: string;
		duration?: string;
		cost?: string;
	}>({});

	useEffect(() => {
		if (service) {
			setName(service.name);
			setDescription(service.description);
			setDuration(String(service.durationMinutes));
			setCost(service.price > 0 ? String(service.price) : "");
		} else {
			setName("");
			setDescription("");
			setDuration("");
			setCost("");
		}
	}, [service]);

	useEffect(() => {
		if (Object.keys(fieldErrors).length === 0) return;
		const t = window.setTimeout(() => setFieldErrors({}), ERROR_VISIBILITY_MS);
		return () => window.clearTimeout(t);
	}, [fieldErrors]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) return;

		const nextErrors: typeof fieldErrors = {};
		const normalizedName = name.trim();
		const normalizedDescription = description.trim();
		const durationNumber = Number(duration);
		const costNumber = Number(cost);

		if (!normalizedName) nextErrors.name = "Inserisci un nome.";
		if (!normalizedDescription) nextErrors.description = "Inserisci una descrizione.";
		if (!duration || Number.isNaN(durationNumber) || durationNumber <= 0) {
			nextErrors.duration = "Inserisci una durata in minuti.";
		}
		if (!cost || Number.isNaN(costNumber) || costNumber < 0) {
			nextErrors.cost = "Inserisci un prezzo.";
		}

		if (Object.keys(nextErrors).length > 0) {
			setFieldErrors(nextErrors);
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			const supabase = getSupabaseBrowserClient();
			const { data: { session } } = await supabase.auth.getSession();

			if (!session) {
				toast.error("Sessione non valida. Effettua di nuovo il login.", {
					duration: ERROR_VISIBILITY_MS,
				});
				router.replace(`/login?next=${encodeURIComponent(`/admin/services/${isEdit ? service!.id : "new"}`)}`);
				return;
			}

			if (isEdit && service) {
				const { error } = await supabase
					.from("services")
					.update({
						name: normalizedName,
						description: normalizedDescription,
						duration_minutes: durationNumber,
						price: costNumber,
					})
					.eq("id", service.id);

				if (error) {
					toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}
				toast.success("Servizio aggiornato correttamente.");
			} else {
				const payloads = buildInsertPayloads({
					name: normalizedName,
					description: normalizedDescription,
					duration: durationNumber,
					price: costNumber,
				});
				let saved = false;
				let lastErrorMessage = "Impossibile salvare il servizio.";
				for (const payload of payloads) {
					const { error } = await supabase.from("services").insert(payload);
					if (!error) {
						saved = true;
						break;
					}
					lastErrorMessage = error.message;
				}
				if (!saved) {
					toast.error(lastErrorMessage, { duration: ERROR_VISIBILITY_MS });
					return;
				}
				toast.success("Servizio creato correttamente.");
			}

			router.push("/admin/services");
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
						<label className="mb-1.5 block text-sm font-semibold text-zinc-900" htmlFor="service-name">
							Nome
						</label>
						<input
							id="service-name"
							name="name"
							type="text"
							className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
								fieldErrors.name ? "border-red-500" : "border-zinc-300"
							}`}
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								if (fieldErrors.name) setFieldErrors((c) => ({ ...c, name: undefined }));
							}}
						/>
						{fieldErrors.name ? <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p> : null}
					</div>

					<div>
						<label className="mb-1.5 block text-sm font-semibold text-zinc-900" htmlFor="service-description">
							Descrizione
						</label>
						<textarea
							id="service-description"
							name="description"
							rows={4}
							className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
								fieldErrors.description ? "border-red-500" : "border-zinc-300"
							}`}
							value={description}
							onChange={(e) => {
								setDescription(e.target.value);
								if (fieldErrors.description) setFieldErrors((c) => ({ ...c, description: undefined }));
							}}
						/>
						{fieldErrors.description ? <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p> : null}
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1.5 block text-sm font-semibold text-zinc-900" htmlFor="service-duration">
								Durata (minuti)
							</label>
							<input
								id="service-duration"
								name="duration"
								type="number"
								min={1}
								step={1}
								className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
									fieldErrors.duration ? "border-red-500" : "border-zinc-300"
								}`}
								value={duration}
								onChange={(e) => {
									setDuration(e.target.value);
									if (fieldErrors.duration) setFieldErrors((c) => ({ ...c, duration: undefined }));
								}}
							/>
							{fieldErrors.duration ? <p className="mt-1 text-sm text-red-600">{fieldErrors.duration}</p> : null}
						</div>

						<div>
							<label className="mb-1.5 block text-sm font-semibold text-zinc-900" htmlFor="service-cost">
								Costo (EUR)
							</label>
							<input
								id="service-cost"
								name="cost"
								type="number"
								min={0}
								step={0.01}
								className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
									fieldErrors.cost ? "border-red-500" : "border-zinc-300"
								}`}
								value={cost}
								onChange={(e) => {
									setCost(e.target.value);
									if (fieldErrors.cost) setFieldErrors((c) => ({ ...c, cost: undefined }));
								}}
							/>
							{fieldErrors.cost ? <p className="mt-1 text-sm text-red-600">{fieldErrors.cost}</p> : null}
						</div>
					</div>

					<div className="flex justify-end gap-3 pt-2">
						<Link href="/admin/services">
							<Button type="button" variant="outline">
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
