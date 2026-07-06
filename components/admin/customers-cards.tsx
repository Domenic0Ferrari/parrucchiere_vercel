"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { CustomerItem } from "@/app/admin/customers/page";

function formatDate(value: string | null) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";

	return new Intl.DateTimeFormat("it-IT", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
}

export function CustomersCards({ customers }: { customers: CustomerItem[] }) {
	const router = useRouter();
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [confirmCustomer, setConfirmCustomer] = useState<CustomerItem | null>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const closeMenu = () => {
		setOpenMenuId(null);
		setMenuPosition(null);
	};

	const requestDelete = (customer: CustomerItem) => {
		closeMenu();
		setConfirmCustomer(customer);
	};

	const handleDelete = async (customer: CustomerItem) => {
		setDeletingId(customer.id);

		try {
			const supabase = getSupabaseBrowserClient();
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) {
				toast.error("Sessione non valida. Effettua di nuovo il login.");
				router.replace("/login?next=%2Fadmin%2Fcustomers");
				return;
			}

			const { error } = await supabase
				.from("customers")
				.update({ is_active: false })
				.eq("id", customer.id);

			if (error) {
				toast.error(error.message);
				return;
			}

			toast.success("Cliente eliminato.");
			setConfirmCustomer(null);
			router.refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Errore durante l'eliminazione.");
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<>
			<ul className="space-y-3 md:hidden">
				{customers.map((customer) => (
					<li
						key={customer.id}
						className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<p className="font-semibold text-zinc-900">{customer.name}</p>
								<div className="mt-2 grid gap-1 text-zinc-600">
									<p>Telefono: {customer.phone ?? "—"}</p>
									<p className="break-words">Email: {customer.email ?? "—"}</p>
									<p>Creato il: {formatDate(customer.createdAt)}</p>
								</div>
								{customer.note ? (
									<p className="mt-2 text-zinc-600">{customer.note}</p>
								) : null}
							</div>
							<div className="shrink-0">
								<button
									ref={(el) => {
										if (el) buttonRefs.current.set(customer.id, el);
									}}
									type="button"
									className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
									aria-label="Menu azioni"
									onClick={() => {
										if (openMenuId === customer.id) {
											closeMenu();
											return;
										}
										const btn = buttonRefs.current.get(customer.id);
										if (!btn) return;
										const rect = btn.getBoundingClientRect();
										setMenuPosition({ top: rect.bottom + 4, left: rect.right - 140 });
										setOpenMenuId(customer.id);
									}}
									disabled={deletingId === customer.id}
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
							<div className="fixed inset-0 z-[100]" aria-hidden onClick={closeMenu} />
							<div
								className="fixed z-[101] min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
								style={{ top: menuPosition.top, left: menuPosition.left }}
							>
								<Link
									href={`/admin/customers/${openMenuId}`}
									className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
									onClick={closeMenu}
								>
									Modifica
								</Link>
								{(() => {
									const customer = customers.find((item) => item.id === openMenuId);
									if (!customer) return null;
									return (
										<button
											type="button"
											className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
											onClick={() => requestDelete(customer)}
										>
											{deletingId === openMenuId ? "Eliminazione..." : "Elimina"}
										</button>
									);
								})()}
							</div>
						</>,
						document.body
					)
				: null}

			<ConfirmDialog
				open={confirmCustomer !== null}
				title="Elimina cliente"
				description={
					<>
						Sei sicuro di voler eliminare il cliente{" "}
						<b>{confirmCustomer?.name ?? ""}?</b>
					</>
				}
				confirmLabel="Elimina"
				confirmVariant="destructive"
				isLoading={deletingId === confirmCustomer?.id}
				onCancel={() => setConfirmCustomer(null)}
				onConfirm={() => {
					if (confirmCustomer) void handleDelete(confirmCustomer);
				}}
			/>
		</>
	);
}
