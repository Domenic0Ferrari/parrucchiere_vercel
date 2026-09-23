import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { CategoryForm } from "@/components/admin/category-form";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
	color: string | null;
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
		color: typeof row.color === "string" ? row.color : null,
	};
}

async function getCategory(id: string) {
	const supabase = await createSupabaseServerClient();
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
						aria-label="Torna alle categorie"
						className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/35"
					>
						<ArrowLeft aria-hidden="true" className="size-5" />
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
					aria-label="Torna alle categorie"
					className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/35"
				>
					<ArrowLeft aria-hidden="true" className="size-5" />
				</Link>
			</header>
				<Suspense fallback={<p className="text-sm text-zinc-600">Caricamento form...</p>}>
					<CategoryForm category={category} />
				</Suspense>
		</section>
	);
}
