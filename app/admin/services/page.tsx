import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type RawService = Record<string, unknown>;

type ServiceItem = {
	id: string;
	name: string;
	description: string | null;
	price: number | null;
	durationMinutes: number | null;
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
	};
}

async function getServices() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		return { services: [], error: "Config Supabase mancante nelle variabili ambiente." };
	}

	const supabase = createClient(supabaseUrl, supabaseAnonKey);
	const { data, error } = await supabase.from(TABLE_NAME).select("*");
	if (error) {
		return {
			services: [],
			error: error.message,
		};
	}

	const rows = (data ?? []) as RawService[];
	return { services: rows.map((row, index) => normalizeService(row, index)), error: null };
}

export default async function AdminServicesPage() {
	const { services, error } = await getServices();

	return (
		<section className="space-y-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900">Servizi</h1>
					<p className="mt-1 text-sm text-zinc-600">
						Gestisci i servizi del tuo salone.
					</p>
				</div>
				<Link href="/admin/services/new">
					<Button>Aggiungi Servizio</Button>
				</Link>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Lista Servizi</CardTitle>
				</CardHeader>
				<CardContent>
					{error ? (
						<p className="text-sm text-red-600">{error}</p>
					) : services.length === 0 ? (
						<p className="text-sm text-zinc-600">Nessun servizio disponibile.</p>
					) : (
						<ul className="space-y-3">
							{services.map((service) => (
								<li
									key={service.id}
									className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700"
								>
									<p className="font-semibold text-zinc-900">{service.name}</p>
									{service.description ? (
										<p className="mt-1 text-zinc-600">{service.description}</p>
									) : null}
									<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-zinc-600">
										{service.price !== null ? (
											<span>Prezzo: EUR {service.price.toFixed(2)}</span>
										) : null}
										{service.durationMinutes !== null ? (
											<span>Durata: {service.durationMinutes} min</span>
										) : null}
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</section>
	);
}
