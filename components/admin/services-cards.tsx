"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ServiceItem } from "./services-table";

export function ServicesCards({ services }: { services: ServiceItem[] }) {
	const router = useRouter();
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

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

	return (
		<>
		<ul className="space-y-3 md:hidden">
			{services.map((service) => (
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
