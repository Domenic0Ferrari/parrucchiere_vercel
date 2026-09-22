"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/components/auth/employee-session-provider";

export function CategoriesPageHeader() {
	const { user } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";

	return (
		<>
			<header className="flex items-center justify-between gap-3 md:hidden">
				<h1 className="text-xl font-semibold text-zinc-900">Lista categorie</h1>
				{isAdmin ? <Link href="/admin/categories/new"><Button>Aggiungi</Button></Link> : null}
			</header>
			<header className="hidden flex-wrap items-center justify-between gap-3 md:flex">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900">Categorie</h1>
					<p className="mt-1 text-sm text-zinc-600">Gestisci le categorie dei servizi del tuo salone.</p>
				</div>
				{isAdmin ? <Link href="/admin/categories/new"><Button>Aggiungi</Button></Link> : null}
			</header>
		</>
	);
}
