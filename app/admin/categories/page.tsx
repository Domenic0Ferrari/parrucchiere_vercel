import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoriesCards } from "@/components/admin/categories-cards";
import { CategoriesPageHeader } from "@/components/admin/categories-page-header";
import { CategoriesTable } from "@/components/admin/categories-table";
import { createClient } from "@supabase/supabase-js";

type RawCategory = Record<string, unknown>;

export type CategoryItem = {
	id: string;
	name: string;
	displayOrder: number | null;
	isActive: boolean;
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
	};
}

async function getCategories() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		return { categories: [], error: "Config Supabase mancante nelle variabili ambiente." };
	}

	const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
		<section className="space-y-6">
			<CategoriesPageHeader />

			<Card>
				<CardHeader>
					<CardTitle>Lista Categorie</CardTitle>
				</CardHeader>
				<CardContent>
					{error ? (
						<p className="text-sm text-red-600">{error}</p>
					) : categories.length === 0 ? (
						<p className="text-sm text-zinc-600">Nessuna categoria disponibile.</p>
					) : (
						<>
							<CategoriesTable categories={categories} />
							<CategoriesCards categories={categories} />
						</>
					)}
				</CardContent>
			</Card>
		</section>
	);
}
