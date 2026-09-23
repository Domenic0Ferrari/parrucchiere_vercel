import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ServiceForm, type ServiceCategoryOption } from "@/components/admin/service-form";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RawService = Record<string, unknown>;

function toNullableNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string" && value.trim() !== "") {
		const p = Number(value);
		return Number.isFinite(p) ? p : null;
	}
	return null;
}

function normalizeService(row: RawService): {
	id: string;
	name: string;
	description: string;
	price: number;
	durationMinutes: number;
	categoryIds: string[];
} {
	const id = String(row.id ?? "");
	const name = String(row.name ?? row.nome ?? row.title ?? row.service_name ?? "");
	const desc = row.description ?? row.descrizione ?? row.details ?? "";
	const priceVal = row.price ?? row.prezzo ?? row.amount ?? 0;
	const durVal = row.duration_minutes ?? row.duration ?? row.durata ?? row.minutes ?? 0;

	return {
		id,
		name,
		description: typeof desc === "string" && desc.trim() !== "" ? desc : "",
		price: toNullableNumber(priceVal) ?? 0,
		durationMinutes: toNullableNumber(durVal) ?? 0,
		categoryIds: [],
	};
}

function normalizeCategory(row: RawService): ServiceCategoryOption {
	const isActiveValue = row.is_active ?? row.isActive ?? row.active;
	return {
		id: String(row.id ?? row.uuid ?? ""),
		name: String(row.name ?? row.nome ?? row.title ?? "Categoria"),
		isActive: isActiveValue === true || isActiveValue === "true" || isActiveValue === 1,
	};
}

async function getSupabaseClient() {
	return createSupabaseServerClient();
}

async function getCategories() {
	const supabase = await getSupabaseClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("categories")
		.select("*")
		.order("display_order", { ascending: true });

	if (error) return [];
	return ((data ?? []) as RawService[]).map(normalizeCategory).filter((category) => category.id);
}

async function getService(id: string) {
	const supabase = await getSupabaseClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("services")
		.select("*")
		.eq("id", id)
		.single();

	if (error || !data) return null;

	const { data: categoryData } = await supabase
		.from("categories2services")
		.select("categories_id")
		.eq("service_id", id);

	return {
		...normalizeService(data as RawService),
		categoryIds: ((categoryData ?? []) as RawService[])
			.map((row) => row.categories_id)
			.filter((categoryId): categoryId is string | number => Boolean(categoryId))
			.map(String),
	};
}

export default async function ServicePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const categories = await getCategories();

	if (id === "new") {
		return (
			<section className="mx-auto w-full max-w-2xl space-y-6">
				<header className="flex items-center justify-between gap-3">
					<h1 className="text-2xl font-semibold text-zinc-900">Nuovo Servizio</h1>
					<Link
						href="/admin/services"
						aria-label="Torna ai servizi"
						className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/35"
					>
						<ArrowLeft aria-hidden="true" className="size-5" />
					</Link>
				</header>
				<ServiceForm service={null} categories={categories} />
			</section>
		);
	}

	const service = await getService(id);
	if (!service) notFound();

	return (
		<section className="mx-auto w-full max-w-2xl space-y-6">
			<header className="flex items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold text-zinc-900">Modifica Servizio</h1>
				<Link
					href="/admin/services"
					aria-label="Torna ai servizi"
					className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/35"
				>
					<ArrowLeft aria-hidden="true" className="size-5" />
				</Link>
			</header>
			<ServiceForm service={service} categories={categories} />
		</section>
	);
}
