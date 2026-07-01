import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryForm } from "@/components/admin/category-form";

type RawCategory = Record<string, unknown>;

function toNullableNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string" && value.trim() !== "") {
		const p = Number(value);
		return Number.isFinite(p) ? p : null;
	}
	return null;
}

function normalizeCategory(row: RawCategory): {
	id: string;
	name: string;
	displayOrder: number;
	isActive: boolean;
} {
	const id = String(row.id ?? "");
	const name = String(row.name ?? row.nome ?? row.title ?? "");
	const displayOrderValue = row.display_order ?? row.displayOrder ?? row.position ?? 0;
	const isActiveValue = row.is_active ?? row.isActive ?? row.active;

	return {
		id,
		name,
		displayOrder: toNullableNumber(displayOrderValue) ?? 0,
		isActive:
			isActiveValue === true || isActiveValue === "true" || isActiveValue === 1,
	};
}

async function getCategory(id: string) {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !supabaseAnonKey) return null;

	const supabase = createClient(supabaseUrl, supabaseAnonKey);
	const { data, error } = await supabase
		.from("categories")
		.select("*")
		.eq("id", id)
		.single();

	if (error || !data) return null;
	return normalizeCategory(data as RawCategory);
}

export default async function CategoryPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	if (id === "new") {
		return (
			<section className="mx-auto w-full max-w-2xl space-y-6">
				<header className="flex items-center justify-between gap-3">
					<h1 className="text-2xl font-semibold text-zinc-900">Nuova Categoria</h1>
					<Link
						href="/admin/categories"
						className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
					>
						Torna alle categorie
					</Link>
				</header>
				<Suspense fallback={<p className="text-sm text-zinc-600">Caricamento form...</p>}>
					<CategoryForm category={null} />
				</Suspense>
			</section>
		);
	}

	const category = await getCategory(id);
	if (!category) notFound();

	return (
		<section className="mx-auto w-full max-w-2xl space-y-6">
			<header className="flex items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold text-zinc-900">Modifica Categoria</h1>
				<Link
					href="/admin/categories"
					className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
				>
					Torna alle categorie
				</Link>
			</header>
				<Suspense fallback={<p className="text-sm text-zinc-600">Caricamento form...</p>}>
					<CategoryForm category={category} />
				</Suspense>
		</section>
	);
}
