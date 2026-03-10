import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ServiceForm } from "@/components/admin/service-form";

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
	};
}

async function getService(id: string) {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !supabaseAnonKey) return null;

	const supabase = createClient(supabaseUrl, supabaseAnonKey);
	const { data, error } = await supabase
		.from("services")
		.select("*")
		.eq("id", id)
		.single();

	if (error || !data) return null;
	return normalizeService(data as RawService);
}

export default async function ServicePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	if (id === "new") {
		return (
			<section className="mx-auto w-full max-w-2xl space-y-6">
				<header className="flex items-center justify-between gap-3">
					<h1 className="text-2xl font-semibold text-zinc-900">Nuovo Servizio</h1>
					<Link
						href="/admin/services"
						className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
					>
						Torna ai servizi
					</Link>
				</header>
				<ServiceForm service={null} />
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
					className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
				>
					Torna ai servizi
				</Link>
			</header>
			<ServiceForm service={service} />
		</section>
	);
}
