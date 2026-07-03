"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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
	categoryIds: string[];
};

export type ServiceCategoryOption = {
	id: string;
	name: string;
	isActive: boolean;
};

type ServiceFormProps = {
	service: ServiceData | null;
	categories: ServiceCategoryOption[];
};

type ServicePayload = {
	name: string;
	description: string;
	duration: number;
	price: number;
	is_active: true;
};

function buildServicePayload(input: { name: string; description: string; duration: number; price: number }): ServicePayload {
	return {
		name: input.name,
		description: input.description,
		duration: input.duration,
		price: input.price,
		is_active: true,
	};
}

async function saveServiceCategories(
	supabase: ReturnType<typeof getSupabaseBrowserClient>,
	serviceId: string,
	categoryIds: string[]
) {
	const { error: deleteError } = await supabase
		.from("categories2services")
		.delete()
		.eq("service_id", serviceId);

	if (deleteError) {
		return deleteError;
	}

	const rows = categoryIds.map((categoryId) => ({
		service_id: serviceId,
		categories_id: categoryId,
	}));
	const { error } = await supabase.from("categories2services").insert(rows);
	return error;
}

export function ServiceForm({ service, categories }: ServiceFormProps) {
	const router = useRouter();
	const isEdit = service !== null;

	const [name, setName] = useState(service?.name ?? "");
	const [description, setDescription] = useState(service?.description ?? "");
	const [duration, setDuration] = useState(service ? String(service.durationMinutes) : "");
	const [cost, setCost] = useState(service && service.price > 0 ? String(service.price) : "");
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(service?.categoryIds ?? []);
	const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const categoryMenuRef = useRef<HTMLDivElement | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		name?: string;
		description?: string;
		duration?: string;
		cost?: string;
		categories?: string;
	}>({});

	const selectableCategories = categories.filter(
		(category) => category.isActive || selectedCategoryIds.includes(category.id)
	);

	const toggleCategory = (categoryId: string) => {
		setSelectedCategoryIds((current) =>
			current.includes(categoryId)
				? current.filter((id) => id !== categoryId)
				: [...current, categoryId]
		);
		if (fieldErrors.categories) {
			setFieldErrors((c) => ({ ...c, categories: undefined }));
		}
	};

	const selectedCategoryNames = categories
		.filter((category) => selectedCategoryIds.includes(category.id))
		.map((category) => category.name);

	const categoryTriggerText =
		selectedCategoryNames.length === 0
			? "Seleziona categorie"
			: selectedCategoryNames.length <= 2
				? selectedCategoryNames.join(", ")
				: `${selectedCategoryNames.slice(0, 2).join(", ")} +${selectedCategoryNames.length - 2}`;

	useEffect(() => {
		if (service) {
			setName(service.name);
			setDescription(service.description);
			setDuration(String(service.durationMinutes));
			setCost(service.price > 0 ? String(service.price) : "");
			setSelectedCategoryIds(service.categoryIds);
		} else {
			setName("");
			setDescription("");
			setDuration("");
			setCost("");
			setSelectedCategoryIds([]);
		}
	}, [service]);

	useEffect(() => {
		if (Object.keys(fieldErrors).length === 0) return;
		const t = window.setTimeout(() => setFieldErrors({}), ERROR_VISIBILITY_MS);
		return () => window.clearTimeout(t);
	}, [fieldErrors]);

	useEffect(() => {
		if (!isCategoryMenuOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			if (
				categoryMenuRef.current &&
				!categoryMenuRef.current.contains(event.target as Node)
			) {
				setIsCategoryMenuOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [isCategoryMenuOpen]);

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
		if (selectedCategoryIds.length === 0) {
			nextErrors.categories = "Seleziona almeno una categoria.";
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
						duration: durationNumber,
						price: costNumber,
					})
					.eq("id", service.id);

				if (error) {
					toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}
				const categoryError = await saveServiceCategories(
					supabase,
					service.id,
					selectedCategoryIds
				);
				if (categoryError) {
					toast.error(categoryError.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}
				toast.success("Servizio aggiornato correttamente.");
			} else {
				const payload = buildServicePayload({
					name: normalizedName,
					description: normalizedDescription,
					duration: durationNumber,
					price: costNumber,
				});
				const { data, error } = await supabase
					.from("services")
					.insert(payload)
					.select("id")
					.single();

				if (error) {
					toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}
				const createdServiceId = data?.id ? String(data.id) : null;
				if (!createdServiceId) {
					toast.error("Servizio creato, ma impossibile leggere il suo id.", {
						duration: ERROR_VISIBILITY_MS,
					});
					return;
				}
				const categoryError = await saveServiceCategories(
					supabase,
					createdServiceId,
					selectedCategoryIds
				);
				if (categoryError) {
					await supabase.from("services").delete().eq("id", createdServiceId);
					toast.error(categoryError.message, { duration: ERROR_VISIBILITY_MS });
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

					<div>
						<div className="mb-1.5 flex items-center justify-between gap-3">
							<label className="block text-sm font-semibold text-zinc-900">
								Categorie
							</label>
							<span className="text-xs text-zinc-500">
								{selectedCategoryIds.length} selezionate
							</span>
						</div>
						{selectableCategories.length === 0 ? (
							<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
								Nessuna categoria attiva disponibile. Crea o riattiva una categoria.
							</p>
						) : (
							<div className="relative" ref={categoryMenuRef}>
								<button
									type="button"
									aria-haspopup="listbox"
									aria-expanded={isCategoryMenuOpen}
									className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2.5 text-left text-sm outline-none transition focus:border-zinc-900 ${
										fieldErrors.categories ? "border-red-500" : "border-zinc-300"
									}`}
									onClick={() => setIsCategoryMenuOpen((open) => !open)}
								>
									<span
										className={`min-w-0 flex-1 truncate ${
											selectedCategoryNames.length === 0 ? "text-zinc-500" : "text-zinc-900"
										}`}
									>
										{categoryTriggerText}
									</span>
									<ChevronDown
										className={`h-4 w-4 shrink-0 text-zinc-500 transition ${
											isCategoryMenuOpen ? "rotate-180" : ""
										}`}
										aria-hidden="true"
									/>
								</button>

								{isCategoryMenuOpen ? (
									<div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
										<ul
											role="listbox"
											aria-multiselectable="true"
											className="max-h-64 divide-y divide-zinc-100 overflow-y-auto py-1"
										>
											{selectableCategories.map((category) => {
												const checked = selectedCategoryIds.includes(category.id);
												return (
													<li key={category.id} role="option" aria-selected={checked}>
														<button
															type="button"
															className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
																checked
																	? "bg-zinc-50 text-zinc-900"
																	: "text-zinc-700 hover:bg-zinc-50"
															}`}
															onClick={() => toggleCategory(category.id)}
														>
															<span className="min-w-0 flex-1 truncate">{category.name}</span>
															{category.isActive ? null : (
																<span className="text-xs text-zinc-500">Disattiva</span>
															)}
															<span
																className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
																	checked
																		? "border-zinc-900 bg-zinc-900 text-white"
																		: "border-zinc-300 bg-white text-transparent"
																}`}
																aria-hidden="true"
															>
																<Check className="h-3.5 w-3.5" />
															</span>
														</button>
													</li>
												);
											})}
										</ul>
									</div>
								) : null}
							</div>
						)}
						{fieldErrors.categories ? (
							<p className="mt-1 text-sm text-red-600">{fieldErrors.categories}</p>
						) : null}
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
