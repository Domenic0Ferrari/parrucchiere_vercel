"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/components/auth/employee-session-provider";

export function CategoriesPageHeader() {
	const { user } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";

	return (
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 className="text-2xl font-semibold text-zinc-900">Categorie</h1>
				<p className="mt-1 text-sm text-zinc-600">
					Gestisci le categorie dei servizi del tuo salone.
				</p>
				<p className="mt-2 text-xs text-zinc-500">
					Staff e admin visualizzano anche le categorie disattive; solo gli admin possono
					crearle, modificarle o cambiarne lo stato.
				</p>
			</div>
			{isAdmin ? (
				<Link href="/admin/categories/new">
					<Button>Aggiungi Categoria</Button>
				</Link>
			) : null}
		</header>
	);
}
