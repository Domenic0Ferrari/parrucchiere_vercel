"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

export type ServiceItem = {
	id: string;
	name: string;
	description: string | null;
	price: number | null;
	durationMinutes: number | null;
};

type SortKey = "name" | "description" | "price" | "durationMinutes";
type SortDir = "asc" | "desc";

function sortServices(
	services: ServiceItem[],
	key: SortKey,
	dir: SortDir
): ServiceItem[] {
	return [...services].sort((a, b) => {
		const aVal = a[key];
		const bVal = b[key];
		const aStr = aVal != null ? String(aVal).toLowerCase() : "";
		const bStr = bVal != null ? String(bVal).toLowerCase() : "";
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

export function ServicesTable({ services }: { services: ServiceItem[] }) {
	const router = useRouter();
	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const handleSort = useCallback((key: SortKey) => {
		setSortKey((k) => {
			if (k === key) {
				setSortDir((d) => (d === "asc" ? "desc" : "asc"));
				return key;
			}
			setSortDir("asc");
			return key;
		});
	}, []);

	const sorted = sortServices(services, sortKey, sortDir);

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
			const { error } = await supabase.from("services").delete().eq("id", id);
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
		<div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 min-h-[400px]">
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
										openMenuId === service.id ? closeMenu() : openMenu(service.id);
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
				</tbody>
			</table>

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
