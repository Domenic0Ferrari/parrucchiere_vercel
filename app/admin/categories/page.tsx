import { CategoriesCards } from "@/components/admin/categories-cards";
import { CategoriesPageHeader } from "@/components/admin/categories-page-header";
import { CategoriesTable } from "@/components/admin/categories-table";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RawCategory = Record<string, unknown>;

export type CategoryItem = {
	id: string;
	name: string;
	displayOrder: number | null;
	isActive: boolean;
	color: string | null;
};

const TABLE_NAME = "categories";

function toNullableNumber(value: unknown): number | null {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function normalizeCategory(row: RawCategory, index: number): CategoryItem {
	const id = String(row.id ?? row.uuid ?? index);
	const name = String(row.name ?? row.nome ?? row.title ?? "Categoria");
	const displayOrderValue = row.display_order ?? row.displayOrder ?? row.position ?? row.posizione;
	const isActiveValue = row.is_active ?? row.isActive ?? row.active;

	return {
		id,
		name,
		displayOrder: toNullableNumber(displayOrderValue),
		isActive: isActiveValue === true || isActiveValue === "true" || isActiveValue === 1,
		color: typeof row.color === "string" ? row.color : null,
	};
}

async function getCategories() {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from(TABLE_NAME)
		.select("*")
		.order("display_order", { ascending: true });

	if (error) {
		return {
			categories: [],
			error: error.message,
		};
	}

	const rows = (data ?? []) as RawCategory[];
	return {
		categories: rows.map((row, index) => normalizeCategory(row, index)),
		error: null,
	};
}

export default async function AdminCategoriesPage() {
	const { categories, error } = await getCategories();

	return (
		<section className="-mt-3 space-y-6 md:mt-0">
			<CategoriesPageHeader />
			<div className="md:hidden">
				{error ? <p className="text-sm text-red-600">{error}</p> : categories.length === 0 ? <p className="text-sm text-zinc-600">Nessuna categoria disponibile.</p> : <CategoriesCards categories={categories} />}
			</div>
			<div className="hidden md:block">
				{error ? <p className="text-sm text-red-600">{error}</p> : categories.length === 0 ? <p className="text-sm text-zinc-600">Nessuna categoria disponibile.</p> : <CategoriesTable categories={categories} />}
			</div>
		</section>
	);
}
