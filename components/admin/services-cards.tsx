"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ServiceCategoryItem, ServiceItem } from "./services-table";

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

export function ServicesCards({ services }: { services: ServiceItem[] }) {
	const router = useRouter();
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const categoryFilterRef = useRef<HTMLDivElement>(null);
	const categories = [...new Set(services.flatMap((service) => service.categories.map((category) => category.name)))].sort((a, b) => a.localeCompare(b));
	const filteredServices = services.filter((service) => {
		const term = search.trim().toLocaleLowerCase("it-IT");
		const matchesSearch = !term || [service.name, service.description ?? "", ...service.categories.map((category) => category.name)]
			.some((value) => value.toLocaleLowerCase("it-IT").includes(term));
		const matchesCategories = selectedCategories.length === 0 || service.categories.some((category) => selectedCategories.includes(category.name));
		return matchesSearch && matchesCategories;
	});

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

	return (
		<>
		<div className="md:hidden">
			<div className="mb-4 space-y-3">
				<div>
					<label htmlFor="services-search-mobile" className="mb-1.5 block text-sm font-semibold text-zinc-900">Cerca servizi</label>
					<div className="relative">
						<Input id="services-search-mobile" type="text" inputMode="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, descrizione o categoria" className="pr-10" />
						{search ? <button type="button" onClick={() => setSearch("")} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-red-500 transition hover:text-red-700" aria-label="Cancella ricerca"><X className="h-4 w-4" /></button> : null}
					</div>
				</div>
				{categories.length > 0 ? (
					<div ref={categoryFilterRef} className="relative">
						<p className="mb-1.5 text-sm font-semibold text-zinc-900">Categorie</p>
						<button type="button" onClick={() => setCategoryFilterOpen((open) => !open)} className={`h-10 w-full rounded-lg border px-3 text-left text-sm font-medium transition ${selectedCategories.length > 0 ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"}`} aria-expanded={categoryFilterOpen} aria-controls="services-category-filter-mobile">Filtra categorie{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ""}</button>
						{categoryFilterOpen ? (
							<div id="services-category-filter-mobile" className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
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
		<ul className="space-y-3">
			{filteredServices.map((service) => (
				<li
					key={service.id}
					className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-zinc-900">{service.name}</p>
							{service.description ? (
								<p className="mt-1 text-zinc-600">{service.description}</p>
							) : null}
							<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-zinc-600">
								{service.price !== null ? (
									<span>Prezzo: EUR {service.price.toFixed(2)}</span>
								) : null}
								{service.durationMinutes !== null ? (
									<span>Durata: {service.durationMinutes} min</span>
								) : null}
							</div>
							<div className="mt-2 flex flex-wrap gap-1.5">
								{service.categories.length > 0 ? (
									service.categories.map((category) => (
										<CategoryBadge key={category.name} category={category} />
									))
								) : (
									<span className="text-xs text-zinc-500">Nessuna categoria</span>
								)}
							</div>
						</div>
						<div className="shrink-0">
							<button
								ref={(el) => {
									if (el) buttonRefs.current.set(service.id, el);
								}}
								type="button"
								className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
								aria-label="Menu azioni"
								onClick={() => {
									if (openMenuId === service.id) {
										setOpenMenuId(null);
										setMenuPosition(null);
									} else {
										const btn = buttonRefs.current.get(service.id);
										if (btn) {
											const rect = btn.getBoundingClientRect();
											setMenuPosition({ top: rect.bottom + 4, left: rect.right - 140 });
											setOpenMenuId(service.id);
										}
									}
								}}
								disabled={deletingId === service.id}
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
					</div>
				</li>
			))}
			{filteredServices.length === 0 ? <li className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600">Nessun servizio corrisponde alla ricerca.</li> : null}
		</ul>
		</div>

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
							className="fixed z-[101] min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
							style={{ top: menuPosition.top, left: menuPosition.left }}
						>
							<Link
								href={`/admin/services/${openMenuId}`}
								className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
								onClick={() => {
									setOpenMenuId(null);
									setMenuPosition(null);
								}}
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
		</>
	);
}
