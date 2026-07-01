"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuthSession } from "@/components/auth/employee-session-provider";
import {
	activePositionConflictMessage,
	findActivePositionConflict,
} from "@/lib/category-display-order";

const ERROR_VISIBILITY_MS = 3000;

type CategoryData = {
	id: string;
	name: string;
	displayOrder: number;
	isActive: boolean;
};

type CategoryFormProps = {
	category: CategoryData | null;
};

type FieldErrors = {
	name?: string;
	displayOrder?: string;
};

export function CategoryForm({ category }: CategoryFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const reactivateIntent = searchParams.get("reactivate") === "1";
	const { user } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";
	const isEdit = category !== null;
	const isInactive = isEdit && category !== null && !category.isActive;

	const [name, setName] = useState(category?.name ?? "");
	const [displayOrder, setDisplayOrder] = useState(
		category ? String(category.displayOrder) : ""
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isReactivating, setIsReactivating] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	useEffect(() => {
		if (category) {
			setName(category.name);
			setDisplayOrder(String(category.displayOrder));
		} else {
			setName("");
			setDisplayOrder("");
		}
	}, [category]);

	useEffect(() => {
		if (Object.keys(fieldErrors).length === 0) return;
		const t = window.setTimeout(() => setFieldErrors({}), ERROR_VISIBILITY_MS);
		return () => window.clearTimeout(t);
	}, [fieldErrors]);

	useEffect(() => {
		if (!isAdmin) {
			toast.error("Non hai i permessi per gestire le categorie.");
			router.replace("/admin/categories");
		}
	}, [isAdmin, router]);

	const validateFields = (): { normalizedName: string; displayOrderNumber: number } | null => {
		const nextErrors: FieldErrors = {};
		const normalizedName = name.trim();
		const displayOrderNumber = Number(displayOrder);

		if (!normalizedName) nextErrors.name = "Inserisci un nome.";
		if (
			displayOrder === "" ||
			Number.isNaN(displayOrderNumber) ||
			displayOrderNumber < 0 ||
			!Number.isInteger(displayOrderNumber)
		) {
			nextErrors.displayOrder = "Inserisci una posizione valida (numero intero >= 0).";
		}

		if (Object.keys(nextErrors).length > 0) {
			setFieldErrors(nextErrors);
			return null;
		}

		return { normalizedName, displayOrderNumber };
	};

	const checkActivePositionConflict = async (
		displayOrderNumber: number,
		excludeId?: string
	): Promise<string | null> => {
		const supabase = getSupabaseBrowserClient();
		const { data: activeCategories, error: conflictQueryError } = await supabase
			.from("categories")
			.select("id, name, display_order, is_active")
			.eq("is_active", true)
			.eq("display_order", displayOrderNumber);

		if (conflictQueryError) {
			toast.error(conflictQueryError.message, { duration: ERROR_VISIBILITY_MS });
			return conflictQueryError.message;
		}

		const conflict = findActivePositionConflict(
			(activeCategories ?? []).map((row) => ({
				id: String(row.id),
				name: String(row.name),
				displayOrder: Number(row.display_order),
				isActive: true,
			})),
			displayOrderNumber,
			excludeId
		);

		if (conflict) {
			const message = activePositionConflictMessage(displayOrderNumber, conflict.name);
			setFieldErrors({ displayOrder: message });
			return message;
		}

		return null;
	};

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
				`/login?next=${encodeURIComponent(`/admin/categories/${isEdit ? category!.id : "new"}`)}`
			);
			return false;
		}

		return true;
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting || isReactivating || !isAdmin) return;

		const validated = validateFields();
		if (!validated) return;

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			if (!(await ensureSession())) return;

			const conflictError = await checkActivePositionConflict(
				validated.displayOrderNumber,
				isEdit ? category?.id : undefined
			);
			if (conflictError) return;

			const supabase = getSupabaseBrowserClient();

			if (isEdit && category) {
				const { error } = await supabase
					.from("categories")
					.update({
						name: validated.normalizedName,
						display_order: validated.displayOrderNumber,
					})
					.eq("id", category.id);

				if (error) {
					toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}
				toast.success("Categoria aggiornata correttamente.");
			} else {
				const { error } = await supabase.from("categories").insert({
					name: validated.normalizedName,
					display_order: validated.displayOrderNumber,
					is_active: true,
				});

				if (error) {
					toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
					return;
				}
				toast.success("Categoria creata correttamente.");
			}

			router.push("/admin/categories");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Errore imprevisto durante il salvataggio.",
				{ duration: ERROR_VISIBILITY_MS }
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleReactivate = async () => {
		if (isSubmitting || isReactivating || !isAdmin || !category) return;

		const validated = validateFields();
		if (!validated) return;

		setFieldErrors({});
		setIsReactivating(true);

		try {
			if (!(await ensureSession())) return;

			const conflictError = await checkActivePositionConflict(
				validated.displayOrderNumber,
				category.id
			);
			if (conflictError) return;

			const supabase = getSupabaseBrowserClient();
			const { error } = await supabase
				.from("categories")
				.update({
					name: validated.normalizedName,
					display_order: validated.displayOrderNumber,
					is_active: true,
				})
				.eq("id", category.id);

			if (error) {
				toast.error(error.message, { duration: ERROR_VISIBILITY_MS });
				return;
			}

			toast.success("Categoria riattivata correttamente.");
			router.push("/admin/categories");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Errore imprevisto durante la riattivazione.",
				{ duration: ERROR_VISIBILITY_MS }
			);
		} finally {
			setIsReactivating(false);
		}
	};

	if (!isAdmin) {
		return null;
	}

	const isBusy = isSubmitting || isReactivating;

	return (
		<Card>
			<CardContent className="pt-6">
				{isInactive ? (
					<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
						{reactivateIntent ? (
							<>
								La posizione attuale è già occupata da un&apos;altra categoria attiva.
								Modifica la posizione e clicca <strong>Riattiva categoria</strong>.
							</>
						) : (
							<>
								Questa categoria è disattivata. Puoi aggiornare i dati con{" "}
								<strong>Salva modifiche</strong> oppure riattivarla direttamente da qui.
							</>
						)}
					</div>
				) : null}

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label
							className="mb-1.5 block text-sm font-semibold text-zinc-900"
							htmlFor="category-name"
						>
							Nome
						</label>
						<input
							id="category-name"
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
						{fieldErrors.name ? (
							<p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
						) : null}
					</div>

					<div>
						<label
							className="mb-1.5 block text-sm font-semibold text-zinc-900"
							htmlFor="category-display-order"
						>
							Posizione
						</label>
						<input
							id="category-display-order"
							name="displayOrder"
							type="number"
							min={0}
							step={1}
							className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 ${
								fieldErrors.displayOrder ? "border-red-500" : "border-zinc-300"
							}`}
							value={displayOrder}
							onChange={(e) => {
								setDisplayOrder(e.target.value);
								if (fieldErrors.displayOrder) {
									setFieldErrors((c) => ({ ...c, displayOrder: undefined }));
								}
							}}
						/>
						{fieldErrors.displayOrder ? (
							<p className="mt-1 text-sm text-red-600">{fieldErrors.displayOrder}</p>
						) : (
							<p className="mt-1 text-xs text-zinc-500">
								La posizione deve essere univoca tra le categorie attive. Una categoria
								disattivata non occupa la posizione e può essere riutilizzata.
							</p>
						)}
					</div>

					<div className="flex flex-wrap justify-end gap-3 pt-2">
						<Link href="/admin/categories">
							<Button type="button" variant="outline" disabled={isBusy}>
								Annulla
							</Button>
						</Link>
						{isInactive ? (
							<Button
								type="button"
								disabled={isBusy}
								className="bg-emerald-700 text-white hover:bg-emerald-800"
								onClick={() => void handleReactivate()}
							>
								{isReactivating ? "Riattivazione..." : "Riattiva categoria"}
							</Button>
						) : null}
						<Button type="submit" disabled={isBusy}>
							{isSubmitting ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Salva"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
