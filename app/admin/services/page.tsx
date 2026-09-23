import { Button } from "@/components/ui/button";
import { ServicesCards } from "@/components/admin/services-cards";
import { ServicesTable } from "@/components/admin/services-table";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RawService = Record<string, unknown>;

export type ServiceItem = {
	id: string;
	name: string;
	description: string | null;
	price: number | null;
	durationMinutes: number | null;
	categories: ServiceCategoryItem[];
};

export type ServiceCategoryItem = {
	name: string;
	isActive: boolean;
	color: string | null;
};

const TABLE_NAME = "services";

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

function normalizeService(row: RawService, index: number): ServiceItem {
	const id = String(row.id ?? row.uuid ?? row.service_id ?? index);
	const name = String(
		row.name ?? row.nome ?? row.title ?? row.titolo ?? row.service_name ?? "Servizio"
	);
	const descriptionValue =
		row.description ?? row.descrizione ?? row.details ?? row.dettagli;
	const priceValue = row.price ?? row.prezzo ?? row.amount;
	const durationValue =
		row.duration_minutes ?? row.duration ?? row.durata ?? row.minutes ?? row.minuti;

	return {
		id,
		name,
		description:
			typeof descriptionValue === "string" && descriptionValue.trim() !== ""
				? descriptionValue
				: null,
		price: toNullableNumber(priceValue),
		durationMinutes: toNullableNumber(durationValue),
		categories: [],
	};
}

function normalizeServiceCategory(row: RawService): {
	serviceId: string;
	category: ServiceCategoryItem;
} | null {
	const serviceId = row.service_id ?? row.serviceId;
	const category = row.categories;

	if (!serviceId || typeof category !== "object" || category === null) {
		return null;
	}

	const categoryRow = category as RawService;
	const categoryName = categoryRow.name ?? categoryRow.nome ?? categoryRow.title;
	if (!categoryName) return null;
	const isActiveValue = categoryRow.is_active ?? categoryRow.isActive ?? categoryRow.active;

	return {
		serviceId: String(serviceId),
		category: {
			name: String(categoryName),
			isActive: isActiveValue === true || isActiveValue === "true" || isActiveValue === 1,
			color: typeof categoryRow.color === "string" ? categoryRow.color : null,
		},
	};
}

async function getServices() {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from(TABLE_NAME)
		.select("*")
		.eq("is_active", true);
	if (error) {
		return {
			services: [],
			error: error.message,
		};
	}

	const { data: serviceCategoryData } = await supabase
		.from("categories2services")
		.select("service_id, categories(name, color, is_active)")
		.order("name", { referencedTable: "categories", ascending: true });

	const categoriesByServiceId = new Map<string, ServiceCategoryItem[]>();
	for (const row of (serviceCategoryData ?? []) as RawService[]) {
		const item = normalizeServiceCategory(row);
		if (!item) continue;
		const current = categoriesByServiceId.get(item.serviceId) ?? [];
		current.push(item.category);
		categoriesByServiceId.set(item.serviceId, current);
	}

	const rows = (data ?? []) as RawService[];
	return {
		services: rows.map((row, index) => {
			const service = normalizeService(row, index);
			return {
				...service,
				categories: categoriesByServiceId.get(service.id) ?? [],
			};
		}),
		error: null,
	};
}

export default async function AdminServicesPage() {
	const { services, error } = await getServices();

	return (
		<section className="-mt-3 space-y-6 md:mt-0">
			<header className="flex items-center justify-between gap-3 md:hidden">
				<h1 className="text-xl font-semibold text-zinc-900">Lista servizi</h1>
				<Link href="/admin/services/new">
					<Button>Aggiungi</Button>
				</Link>
			</header>

			<header className="hidden flex-wrap items-center justify-between gap-3 md:flex">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900">Servizi</h1>
					<p className="mt-1 text-sm text-zinc-600">
						Gestisci i servizi del tuo salone.
					</p>
				</div>
				<Link href="/admin/services/new">
					<Button>Aggiungi</Button>
				</Link>
			</header>

			<div className="md:hidden">
				{error ? (
					<p className="text-sm text-red-600">{error}</p>
				) : services.length === 0 ? (
					<p className="text-sm text-zinc-600">Nessun servizio disponibile.</p>
				) : (
					<ServicesCards services={services} />
				)}
			</div>

			<div className="hidden md:block">
				{error ? (
					<p className="text-sm text-red-600">{error}</p>
				) : services.length === 0 ? (
					<p className="text-sm text-zinc-600">Nessun servizio disponibile.</p>
				) : (
					<ServicesTable services={services} />
				)}
			</div>
		</section>
	);
}
