"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuthSession } from "@/components/auth/employee-session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryStatusFilter, type CategoryStatusFilterValue } from "./category-status-filter";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
	findActivePositionConflict,
	reactivatePositionConflictMessage,
} from "@/lib/category-display-order";

export type CategoryItem = {
	id: string;
	name: string;
	displayOrder: number | null;
	isActive: boolean;
	color: string | null;
};

type SortKey = "name" | "displayOrder" | "isActive";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 20;

function sortCategories(
	categories: CategoryItem[],
	key: SortKey,
	dir: SortDir
): CategoryItem[] {
	return [...categories].sort((a, b) => {
		const aVal = a[key];
		const bVal = b[key];
		const aStr = aVal != null ? String(aVal).toLowerCase() : "";
		const bStr = bVal != null ? String(bVal).toLowerCase() : "";
		const aNum = typeof aVal === "number" ? aVal : Number.NaN;
		const bNum = typeof bVal === "number" ? bVal : Number.NaN;

		let cmp: number;
		if (key === "displayOrder") {
			cmp = (Number.isNaN(aNum) ? -Infinity : aNum) - (Number.isNaN(bNum) ? -Infinity : bNum);
		} else if (key === "isActive") {
			cmp = Number(a.isActive) - Number(b.isActive);
		} else {
			cmp = aStr.localeCompare(bStr);
		}
		return dir === "asc" ? cmp : -cmp;
	});
}

function SortIcon({ dir }: { dir: SortDir | null }) {
	if (!dir) return <span className="ml-0.5 inline-block w-4 text-zinc-400">↕</span>;
	return (
		<span className="ml-0.5 inline-block w-4 text-zinc-600">
			{dir === "asc" ? "↑" : "↓"}
		</span>
	);
}

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

export function CategoriesTable({ categories }: { categories: CategoryItem[] }) {
	const router = useRouter();
	const { user } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";

	const [sortKey, setSortKey] = useState<SortKey>("displayOrder");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<CategoryStatusFilterValue>("all");
	const [page, setPage] = useState(1);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [confirmCategory, setConfirmCategory] = useState<CategoryItem | null>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const handleSort = useCallback((key: SortKey) => {
		setPage(1);
		setSortKey((k) => {
			if (k === key) {
				setSortDir((d) => (d === "asc" ? "desc" : "asc"));
				return key;
			}
			setSortDir("asc");
			return key;
		});
	}, []);

	const filtered = categories.filter((category) => {
		const matchesSearch = category.name.toLocaleLowerCase("it-IT").includes(search.trim().toLocaleLowerCase("it-IT"));
		const matchesStatus = statusFilter === "all" || category.isActive === (statusFilter === "active");
		return matchesSearch && matchesStatus;
	});
	const sorted = sortCategories(filtered, sortKey, sortDir);
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginatedCategories = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

	const handleRowDoubleClick = (id: string) => {
		if (!isAdmin || updatingId) return;
		router.push(`/admin/categories/${id}`);
	};

	const openMenu = (id: string) => {
		const btn = buttonRefs.current.get(id);
		if (!btn) return;
		const rect = btn.getBoundingClientRect();
		setMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 });
		setOpenMenuId(id);
	};

	const closeMenu = () => {
		setOpenMenuId(null);
		setMenuPosition(null);
	};

	return (
		<div className="hidden min-h-[400px] overflow-hidden rounded-lg border border-zinc-200 bg-white md:block">
			<div className="flex flex-wrap items-end gap-3 border-b border-zinc-200 p-4">
				<div className="w-full max-w-sm">
					<label htmlFor="categories-search" className="mb-1.5 block text-sm font-semibold text-zinc-900">Cerca categorie</label>
					<div className="relative">
						<Input id="categories-search" type="text" inputMode="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nome categoria" className="pr-10" />
						{search ? <button type="button" onClick={() => { setSearch(""); setPage(1); }} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-red-500 hover:text-red-700" aria-label="Cancella ricerca"><X className="h-4 w-4" /></button> : null}
					</div>
				</div>
				<CategoryStatusFilter value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} />
			</div>
			<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-zinc-200 bg-white text-left">
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("name")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Nome
								<SortIcon dir={sortKey === "name" ? sortDir : null} />
							</button>
						</th>
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("displayOrder")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Posizione
								<SortIcon dir={sortKey === "displayOrder" ? sortDir : null} />
							</button>
						</th>
						<th className="px-4 py-3">
							<span className="font-semibold text-zinc-900">Colore</span>
						</th>
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("isActive")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Stato
								<SortIcon dir={sortKey === "isActive" ? sortDir : null} />
							</button>
						</th>
						{isAdmin ? <th className="w-12 px-2 py-3" aria-label="Azioni" /> : null}
					</tr>
				</thead>
				<tbody>
					{paginatedCategories.map((category) => (
						<tr
							key={category.id}
							onDoubleClick={() => handleRowDoubleClick(category.id)}
							className={cn(
								"border-b border-zinc-100 last:border-0 hover:bg-zinc-50 group",
								isAdmin ? "cursor-pointer" : "",
								!category.isActive ? "bg-zinc-50/80" : ""
							)}
						>
							<td
								className={cn(
									"px-4 py-3 font-medium",
									category.isActive ? "text-zinc-900" : "text-zinc-500"
								)}
							>
								{category.name}
							</td>
							<td className="px-4 py-3 text-zinc-600">
								{category.displayOrder !== null ? category.displayOrder : "—"}
							</td>
							<td className="px-4 py-3">
								<span className="inline-flex items-center">
									<span
										className="h-5 w-5 rounded-full border border-zinc-300"
										style={{ backgroundColor: isHexColor(category.color) ? category.color : "#6F929C" }}
										aria-label="Colore categoria"
									/>
								</span>
							</td>
							<td className="px-4 py-3">
								<StatusBadge isActive={category.isActive} />
							</td>
							{isAdmin ? (
								<td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
									<Button
										ref={(el) => {
											if (el) buttonRefs.current.set(category.id, el);
										}}
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
										aria-label="Menu azioni"
										onClick={(e) => {
											e.stopPropagation();
											if (openMenuId === category.id) {
												closeMenu();
												return;
											}
											openMenu(category.id);
										}}
										disabled={updatingId === category.id}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
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
									</Button>
								</td>
							) : null}
						</tr>
					))}
					{sorted.length === 0 ? <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-zinc-600">Nessuna categoria corrisponde alla ricerca.</td></tr> : null}
				</tbody>
			</table>
			</div>
			{sorted.length > PAGE_SIZE ? (
				<div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3">
					<p className="text-sm text-zinc-600">Pagina {currentPage} di {totalPages} · {sorted.length} categorie</p>
					<div className="flex items-center gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current - 1)} disabled={currentPage === 1}>Precedente</Button>
						<Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={currentPage === totalPages}>Successiva</Button>
					</div>
				</div>
			) : null}

			{openMenuId && menuPosition && typeof document !== "undefined"
				? createPortal(
						<>
							<div className="fixed inset-0 z-[100]" aria-hidden onClick={closeMenu} />
							<div
								className="fixed z-[101] min-w-[160px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
								style={{ top: menuPosition.top, left: menuPosition.left }}
							>
								<Link
									href={`/admin/categories/${openMenuId}`}
									className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
									onClick={closeMenu}
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
		</div>
	);
}

function isHexColor(value: string | null): value is string {
	return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
