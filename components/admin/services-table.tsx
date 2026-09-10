"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export type ServiceItem = {
	id: string;
	name: string;
	description: string | null;
	price: number | null;
	durationMinutes: number | null;
	categories: ServiceCategoryItem[];
};

export type ServiceCategoryItem = {
	name: string;
	isActive: boolean;
};

type SortKey = "name" | "description" | "price" | "durationMinutes" | "categories";
type SortDir = "asc" | "desc";

function sortServices(
	services: ServiceItem[],
	key: SortKey,
	dir: SortDir
): ServiceItem[] {
	return [...services].sort((a, b) => {
		const aVal = a[key];
		const bVal = b[key];
		const aStr = Array.isArray(aVal)
			? aVal.map((category) => category.name).join(", ").toLowerCase()
			: aVal != null
				? String(aVal).toLowerCase()
				: "";
		const bStr = Array.isArray(bVal)
			? bVal.map((category) => category.name).join(", ").toLowerCase()
			: bVal != null
				? String(bVal).toLowerCase()
				: "";
		const aNum = typeof aVal === "number" ? aVal : Number.NaN;
		const bNum = typeof bVal === "number" ? bVal : Number.NaN;

		let cmp: number;
		if (key === "price" || key === "durationMinutes") {
			cmp = (Number.isNaN(aNum) ? -Infinity : aNum) - (Number.isNaN(bNum) ? -Infinity : bNum);
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

function CategoryBadge({ category }: { category: ServiceCategoryItem }) {
	return (
		<span
			className={`rounded-full px-2 py-0.5 text-xs font-medium ${
				category.isActive
					? "bg-zinc-100 text-zinc-700"
					: "bg-zinc-200 text-zinc-500"
			}`}
		>
			{category.name}
			{category.isActive ? null : " disattiva"}
		</span>
	);
}

export function ServicesTable({ services }: { services: ServiceItem[] }) {
	const router = useRouter();
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir | null>(null);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const categoryFilterRef = useRef<HTMLDivElement>(null);
	const categories = [...new Set(services.flatMap((service) => service.categories.map((category) => category.name)))].sort((a, b) => a.localeCompare(b));

	const handleSort = useCallback((key: SortKey) => {
		if (sortKey !== key) {
			setSortKey(key);
			setSortDir("asc");
			return;
		}
		if (sortDir === "asc") {
			setSortDir("desc");
			return;
		}
		setSortKey(null);
		setSortDir(null);
	}, [sortDir, sortKey]);

	const filtered = services.filter((service) => {
		const term = search.trim().toLocaleLowerCase("it-IT");
		const matchesSearch = !term || [
			service.name,
			service.description ?? "",
			...service.categories.map((category) => category.name),
		].some((value) => value.toLocaleLowerCase("it-IT").includes(term));
		const matchesCategories = selectedCategories.length === 0 || service.categories.some((category) => selectedCategories.includes(category.name));
		return matchesSearch && matchesCategories;
	});
	const sorted = sortKey && sortDir ? sortServices(filtered, sortKey, sortDir) : filtered;

	const toggleCategory = (categoryName: string) => {
		setSelectedCategories((current) => current.includes(categoryName)
			? current.filter((name) => name !== categoryName)
			: [...current, categoryName]);
	};

	useEffect(() => {
		if (!categoryFilterOpen) return;

		const closeOnOutsideClick = (event: MouseEvent) => {
			if (!categoryFilterRef.current?.contains(event.target as Node)) {
				setCategoryFilterOpen(false);
			}
		};

		document.addEventListener("mousedown", closeOnOutsideClick);
		return () => document.removeEventListener("mousedown", closeOnOutsideClick);
	}, [categoryFilterOpen]);

	const handleDelete = async (id: string) => {
		if (!confirm("Sei sicuro di voler eliminare questo servizio?")) return;
		setOpenMenuId(null);
		setMenuPosition(null);
		setDeletingId(id);
		try {
			const supabase = getSupabaseBrowserClient();
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) {
				toast.error("Sessione non valida. Effettua di nuovo il login.");
				router.replace("/login?next=%2Fadmin%2Fservices");
				return;
			}
			const { error } = await supabase
				.from("services")
				.update({ is_active: false })
				.eq("id", id);
			if (error) {
				toast.error(error.message);
				return;
			}
			toast.success("Servizio eliminato.");
			router.refresh();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Errore durante l'eliminazione.");
		} finally {
			setDeletingId(null);
		}
	};

	const handleRowDoubleClick = (id: string) => {
		if (deletingId) return;
		router.push(`/admin/services/${id}`);
	};

	const openMenu = (id: string) => {
		const btn = buttonRefs.current.get(id);
		if (!btn) return;
		const rect = btn.getBoundingClientRect();
		setMenuPosition({ top: rect.bottom + 4, left: rect.right - 140 });
		setOpenMenuId(id);
	};

	const closeMenu = () => {
		setOpenMenuId(null);
		setMenuPosition(null);
	};

	return (
		<div className="hidden md:block rounded-lg border border-zinc-200 min-h-[400px]">
			<div className="border-b border-zinc-200 bg-zinc-50 p-4">
				<div className="flex flex-wrap items-end gap-3">
				<div className="w-full max-w-sm">
					<label htmlFor="services-search" className="mb-1.5 block text-sm font-semibold text-zinc-900">Cerca servizi</label>
					<div className="relative">
						<Input id="services-search" type="text" inputMode="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, descrizione o categoria" className="pr-10" />
						{search ? <button type="button" onClick={() => setSearch("")} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-red-500 transition hover:text-red-700" aria-label="Cancella ricerca"><X className="h-4 w-4" /></button> : null}
					</div>
				</div>
				{categories.length > 0 ? (
					<div ref={categoryFilterRef} className="relative">
						<p className="mb-1.5 text-sm font-semibold text-zinc-900">Categorie</p>
						<button type="button" onClick={() => setCategoryFilterOpen((open) => !open)} className={`h-10 rounded-lg border px-3 text-sm font-medium transition ${selectedCategories.length > 0 ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"}`} aria-expanded={categoryFilterOpen} aria-controls="services-category-filter">Filtra categorie{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ""}</button>
						{categoryFilterOpen ? (
							<div id="services-category-filter" className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
								<div className="mb-2 flex items-center justify-between gap-2">
									<p className="text-sm font-semibold text-zinc-900">Categorie</p>
									{selectedCategories.length > 0 ? <button type="button" onClick={() => setSelectedCategories([])} className="text-xs font-medium text-red-600 hover:text-red-700">Pulisci</button> : null}
								</div>
								<div className="max-h-56 space-y-2 overflow-y-auto">
									{categories.map((category) => (
										<label key={category} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
											<Checkbox checked={selectedCategories.includes(category)} onCheckedChange={() => toggleCategory(category)} />
											{category}
										</label>
									))}
								</div>
							</div>
						) : null}
					</div>
				) : null}
				</div>
			</div>
			<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-zinc-200 bg-zinc-50 text-left">
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
								onClick={() => handleSort("description")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Descrizione
								<SortIcon dir={sortKey === "description" ? sortDir : null} />
							</button>
						</th>
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("price")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Prezzo
								<SortIcon dir={sortKey === "price" ? sortDir : null} />
							</button>
						</th>
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("categories")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Categorie
								<SortIcon dir={sortKey === "categories" ? sortDir : null} />
							</button>
						</th>
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("durationMinutes")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Durata
								<SortIcon dir={sortKey === "durationMinutes" ? sortDir : null} />
							</button>
						</th>
						<th className="w-12 px-2 py-3" aria-label="Azioni" />
					</tr>
				</thead>
				<tbody>
					{sorted.map((service) => (
						<tr
							key={service.id}
							onDoubleClick={() => handleRowDoubleClick(service.id)}
							className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 cursor-pointer group"
						>
							<td className="px-4 py-3 font-medium text-zinc-900">{service.name}</td>
							<td className="max-w-[200px] truncate px-4 py-3 text-zinc-600">
								{service.description ?? "—"}
							</td>
							<td className="px-4 py-3 text-zinc-600">
								{service.price !== null ? `EUR ${service.price.toFixed(2)}` : "—"}
							</td>
							<td className="max-w-[220px] px-4 py-3 text-zinc-600">
								{service.categories.length > 0 ? (
									<div className="flex flex-wrap gap-1.5">
										{service.categories.map((category) => (
											<CategoryBadge key={category.name} category={category} />
										))}
									</div>
								) : (
									"—"
								)}
							</td>
							<td className="px-4 py-3 text-zinc-600">
								{service.durationMinutes !== null ? `${service.durationMinutes} min` : "—"}
							</td>
							<td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
								<Button
									ref={(el) => {
										if (el) buttonRefs.current.set(service.id, el);
									}}
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
									aria-label="Menu azioni"
								onClick={(e) => {
									e.stopPropagation();
									if (openMenuId === service.id) {
										closeMenu();
										return;
									}
									openMenu(service.id);
								}}
								disabled={deletingId === service.id}
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
						</tr>
					))}
					{sorted.length === 0 ? (
						<tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">Nessun servizio corrisponde alla ricerca.</td></tr>
					) : null}
				</tbody>
			</table>
			</div>

			{openMenuId && menuPosition && typeof document !== "undefined"
				? createPortal(
						<>
							<div
								className="fixed inset-0 z-[100]"
								aria-hidden
								onClick={closeMenu}
							/>
							<div
								className="fixed z-[101] min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
								style={{ top: menuPosition.top, left: menuPosition.left }}
							>
								<Link
									href={`/admin/services/${openMenuId}`}
									className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
									onClick={closeMenu}
								>
									Modifica
								</Link>
								<button
									type="button"
									className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
									onClick={() => handleDelete(openMenuId)}
								>
									{deletingId === openMenuId ? "Eliminazione..." : "Elimina"}
								</button>
							</div>
						</>,
						document.body
					)
				: null}
		</div>
	);
}
