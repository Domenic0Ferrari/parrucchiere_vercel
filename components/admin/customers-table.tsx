"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { matchesCustomerSearch } from "@/lib/customer-search";
import type { CustomerItem } from "@/app/admin/customers/page";

type SortKey = "name" | "phone" | "email" | "createdAt";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 20;

function sortCustomers(
	customers: CustomerItem[],
	key: SortKey,
	dir: SortDir
): CustomerItem[] {
	return [...customers].sort((a, b) => {
		const aVal = a[key];
		const bVal = b[key];
		let cmp: number;

		if (key === "createdAt") {
			const aTime = aVal ? Date.parse(aVal) : Number.NEGATIVE_INFINITY;
			const bTime = bVal ? Date.parse(bVal) : Number.NEGATIVE_INFINITY;
			cmp =
				(Number.isNaN(aTime) ? Number.NEGATIVE_INFINITY : aTime) -
				(Number.isNaN(bTime) ? Number.NEGATIVE_INFINITY : bTime);
		} else {
			cmp = (aVal ?? "").toLowerCase().localeCompare((bVal ?? "").toLowerCase(), "it");
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

export function CustomersTable({ customers }: { customers: CustomerItem[] }) {
	const router = useRouter();
	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [confirmCustomer, setConfirmCustomer] = useState<CustomerItem | null>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const handleSort = useCallback((key: SortKey) => {
		setPage(1);
		setSortKey((currentKey) => {
			if (currentKey === key) {
				setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
				return key;
			}
			setSortDir("asc");
			return key;
		});
	}, []);

	const filtered = customers.filter((customer) => matchesCustomerSearch(customer, search));
	const sorted = sortCustomers(filtered, sortKey, sortDir);
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginatedCustomers = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	const closeMenu = () => {
		setOpenMenuId(null);
		setMenuPosition(null);
	};

	const openMenu = (id: string) => {
		const btn = buttonRefs.current.get(id);
		if (!btn) return;
		const rect = btn.getBoundingClientRect();
		setMenuPosition({ top: rect.bottom + 4, left: rect.right - 140 });
		setOpenMenuId(id);
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

	const handleRowDoubleClick = (id: string) => {
		if (deletingId) return;
		router.push(`/admin/customers/${id}`);
	};

	return (
		<div className="hidden min-h-[400px] overflow-hidden rounded-lg border border-zinc-200 bg-white md:block">
			<div className="border-b border-zinc-200 p-4">
				<div className="w-full max-w-sm">
					<label htmlFor="customers-search" className="mb-1.5 block text-sm font-semibold text-zinc-900">Cerca clienti</label>
					<div className="relative">
						<Input id="customers-search" type="text" inputMode="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nome, telefono o email" className="pr-10" />
						{search ? <button type="button" onClick={() => { setSearch(""); setPage(1); }} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-red-500 transition hover:text-red-700" aria-label="Cancella ricerca"><X className="h-4 w-4" /></button> : null}
					</div>
				</div>
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
								onClick={() => handleSort("phone")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Telefono
								<SortIcon dir={sortKey === "phone" ? sortDir : null} />
							</button>
						</th>
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("email")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Email
								<SortIcon dir={sortKey === "email" ? sortDir : null} />
							</button>
						</th>
						<th className="px-4 py-3 font-semibold text-zinc-900">Note</th>
						<th className="px-4 py-3">
							<button
								type="button"
								onClick={() => handleSort("createdAt")}
								className="flex items-center font-semibold text-zinc-900 hover:text-zinc-700"
							>
								Creato il
								<SortIcon dir={sortKey === "createdAt" ? sortDir : null} />
							</button>
						</th>
						<th className="w-12 px-2 py-3" aria-label="Azioni" />
					</tr>
				</thead>
				<tbody>
					{paginatedCustomers.map((customer) => (
						<tr
							key={customer.id}
							onDoubleClick={() => handleRowDoubleClick(customer.id)}
							className="group cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
						>
							<td className="px-4 py-3 font-medium text-zinc-900">{customer.name}</td>
							<td className="px-4 py-3 text-zinc-600">{customer.phone ?? "—"}</td>
							<td className="px-4 py-3 text-zinc-600">{customer.email ?? "—"}</td>
							<td className="max-w-xs px-4 py-3 text-zinc-600">
								<p className="line-clamp-2">{customer.note ?? "—"}</p>
							</td>
							<td className="px-4 py-3 text-zinc-600">{formatDate(customer.createdAt)}</td>
							<td className="px-2 py-3 text-right" onClick={(event) => event.stopPropagation()}>
								<Button
									ref={(el) => {
										if (el) buttonRefs.current.set(customer.id, el);
									}}
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
									aria-label="Menu azioni"
									onClick={(event) => {
										event.stopPropagation();
										if (openMenuId === customer.id) {
											closeMenu();
											return;
										}
										openMenu(customer.id);
									}}
									disabled={deletingId === customer.id}
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
					{sorted.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">Nessun cliente corrisponde alla ricerca.</td></tr> : null}
				</tbody>
			</table>
			</div>
			{sorted.length > PAGE_SIZE ? (
				<div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3">
					<p className="text-sm text-zinc-600">Pagina {currentPage} di {totalPages} · {sorted.length} clienti</p>
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
		</div>
	);
}
