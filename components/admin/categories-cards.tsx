"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuthSession } from "@/components/auth/employee-session-provider";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	findActivePositionConflict,
	reactivatePositionConflictMessage,
} from "@/lib/category-display-order";
import type { CategoryItem } from "./categories-table";

function StatusBadge({ isActive }: { isActive: boolean }) {
	if (isActive) {
		return (
			<span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
				Attiva
			</span>
		);
	}
	return (
		<span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
			Disattiva
		</span>
	);
}

export function CategoriesCards({ categories }: { categories: CategoryItem[] }) {
	const router = useRouter();
	const { user } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";

	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [confirmCategory, setConfirmCategory] = useState<CategoryItem | null>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const requestToggleActive = (category: CategoryItem) => {
		setOpenMenuId(null);
		setMenuPosition(null);
		setConfirmCategory(category);
	};

	const handleToggleActive = async (category: CategoryItem) => {
		const nextActive = !category.isActive;

		if (nextActive && category.displayOrder !== null) {
			const conflict = findActivePositionConflict(
				categories,
				category.displayOrder,
				category.id
			);
			if (conflict) {
				setConfirmCategory(null);
				toast.error(
					reactivatePositionConflictMessage(category.displayOrder, conflict.name)
				);
				router.push(`/admin/categories/${category.id}?reactivate=1`);
				return;
			}
		}

		setConfirmCategory(null);
		setUpdatingId(category.id);

		try {
			const supabase = getSupabaseBrowserClient();
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) {
				toast.error("Sessione non valida. Effettua di nuovo il login.");
				router.replace("/login?next=%2Fadmin%2Fcategories");
				return;
			}

			const { error } = await supabase
				.from("categories")
				.update({ is_active: nextActive })
				.eq("id", category.id);

			if (error) {
				toast.error(error.message);
				return;
			}

			toast.success(nextActive ? "Categoria riattivata." : "Categoria disattivata.");
			router.refresh();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Errore durante l'aggiornamento.");
		} finally {
			setUpdatingId(null);
		}
	};

	return (
		<>
			<ul className="space-y-3 md:hidden">
				{categories.map((category) => (
					<li
						key={category.id}
						className={cn(
							"rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700",
							!category.isActive ? "bg-zinc-50" : ""
						)}
					>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<p
										className={cn(
											"font-semibold",
											category.isActive ? "text-zinc-900" : "text-zinc-500"
										)}
									>
										{category.name}
									</p>
									<StatusBadge isActive={category.isActive} />
								</div>
								<div className="mt-2 text-zinc-600">
									{category.displayOrder !== null ? (
										<span>Posizione: {category.displayOrder}</span>
									) : (
										<span>Posizione: —</span>
									)}
								</div>
							</div>
							{isAdmin ? (
								<div className="shrink-0">
									<button
										ref={(el) => {
											if (el) buttonRefs.current.set(category.id, el);
										}}
										type="button"
										className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
										aria-label="Menu azioni"
										onClick={() => {
											if (openMenuId === category.id) {
												setOpenMenuId(null);
												setMenuPosition(null);
											} else {
												const btn = buttonRefs.current.get(category.id);
												if (btn) {
													const rect = btn.getBoundingClientRect();
													setMenuPosition({
														top: rect.bottom + 4,
														left: rect.right - 160,
													});
													setOpenMenuId(category.id);
												}
											}
										}}
										disabled={updatingId === category.id}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<circle cx="12" cy="12" r="1" />
											<circle cx="12" cy="5" r="1" />
											<circle cx="12" cy="19" r="1" />
										</svg>
									</button>
								</div>
							) : null}
						</div>
					</li>
				))}
			</ul>

			{openMenuId && menuPosition && typeof document !== "undefined"
				? createPortal(
						<>
							<div
								className="fixed inset-0 z-[100]"
								aria-hidden
								onClick={() => {
									setOpenMenuId(null);
									setMenuPosition(null);
								}}
							/>
							<div
								className="fixed z-[101] min-w-[160px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
								style={{ top: menuPosition.top, left: menuPosition.left }}
							>
								<Link
									href={`/admin/categories/${openMenuId}`}
									className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
									onClick={() => {
										setOpenMenuId(null);
										setMenuPosition(null);
									}}
								>
									Modifica
								</Link>
								{(() => {
									const category = categories.find((c) => c.id === openMenuId);
									if (!category) return null;
									return (
										<button
											type="button"
											className={cn(
												"block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50",
												category.isActive
													? "text-amber-700 hover:bg-amber-50"
													: "text-emerald-700 hover:bg-emerald-50"
											)}
											onClick={() => requestToggleActive(category)}
										>
											{updatingId === openMenuId
												? "Aggiornamento..."
												: category.isActive
													? "Disattiva"
													: "Riattiva"}
										</button>
									);
								})()}
							</div>
						</>,
						document.body
					)
				: null}

			<ConfirmDialog
				open={confirmCategory !== null}
				title={
					confirmCategory?.isActive ? "Disattiva categoria" : "Riattiva categoria"
				}
				description={
					confirmCategory?.isActive ? (
						<>
							Sei sicuro di voler disattivare la categoria <b>{confirmCategory.name} ?</b>
						</>
					) : (
						<>
							Sei sicuro di voler riattivare la categoria <b>{confirmCategory?.name ?? ""} ?</b>
						</>
					)
				}
				confirmLabel={confirmCategory?.isActive ? "Disattiva" : "Riattiva"}
				confirmVariant={confirmCategory?.isActive ? "destructive" : "default"}
				isLoading={updatingId === confirmCategory?.id}
				onCancel={() => setConfirmCategory(null)}
				onConfirm={() => {
					if (confirmCategory) void handleToggleActive(confirmCategory);
				}}
			/>
		</>
	);
}
