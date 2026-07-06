import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomersCards } from "@/components/admin/customers-cards";
import { CustomersTable } from "@/components/admin/customers-table";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type RawCustomer = Record<string, unknown>;

export type CustomerItem = {
	id: string;
	createdAt: string | null;
	name: string;
	phone: string | null;
	email: string | null;
	note: string | null;
	authUserId: string | null;
	isActive: boolean;
};

const TABLE_NAME = "customers";

function toNullableString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function normalizeCustomer(row: RawCustomer, index: number): CustomerItem {
	const isActiveValue = row.is_active ?? row.isActive ?? row.active;

	return {
		id: String(row.id ?? row.uuid ?? index),
		createdAt: toNullableString(row.created_at ?? row.createdAt),
		name: String(row.name ?? row.nome ?? "Cliente"),
		phone: toNullableString(row.phone ?? row.telefono),
		email: toNullableString(row.email),
		note: toNullableString(row.note ?? row.notes),
		authUserId: toNullableString(row.auth_user_id ?? row.authUserId),
		isActive: isActiveValue === true || isActiveValue === "true" || isActiveValue === 1,
	};
}

async function getCustomers() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		return { customers: [], error: "Config Supabase mancante nelle variabili ambiente." };
	}

	const supabase = createClient(supabaseUrl, supabaseAnonKey);
	const { data, error } = await supabase
		.from(TABLE_NAME)
		.select("id, created_at, name, phone, email, note, auth_user_id, is_active")
		.eq("is_active", true)
		.order("name", { ascending: true });

	if (error) {
		return {
			customers: [],
			error: error.message,
		};
	}

	const rows = (data ?? []) as RawCustomer[];
	return {
		customers: rows.map((row, index) => normalizeCustomer(row, index)),
		error: null,
	};
}

export default async function AdminCustomersPage() {
	const { customers, error } = await getCustomers();

	return (
		<section className="space-y-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900">Clienti</h1>
					<p className="mt-1 text-sm text-zinc-600">
						Gestisci i clienti del tuo salone.
					</p>
				</div>
				<Link href="/admin/customers/new">
					<Button>Aggiungi Cliente</Button>
				</Link>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Lista Clienti</CardTitle>
				</CardHeader>
				<CardContent>
					{error ? (
						<p className="text-sm text-red-600">{error}</p>
					) : customers.length === 0 ? (
						<p className="text-sm text-zinc-600">Nessun cliente disponibile.</p>
					) : (
						<>
							<CustomersTable customers={customers} />
							<CustomersCards customers={customers} />
						</>
					)}
				</CardContent>
			</Card>
		</section>
	);
}
