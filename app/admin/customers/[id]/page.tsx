import { CustomerForm } from "@/components/admin/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

type RawCustomer = Record<string, unknown>;
type RawAppointment = Record<string, unknown>;

type CustomerData = {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	note: string | null;
};

type LastAppointment = {
	id: string;
	startTime: string | null;
	endTime: string | null;
	status: string | null;
	serviceName: string | null;
	employeeName: string | null;
	finalPrice: number | null;
	finalDurationMinutes: number | null;
	clientNote: string | null;
	staffNote: string | null;
	appointmentSource: string | null;
};

function toNullableString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function normalizeCustomer(row: RawCustomer): {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	note: string | null;
} {
	return {
		id: String(row.id ?? ""),
		name: String(row.name ?? ""),
		phone: toNullableString(row.phone),
		email: toNullableString(row.email),
		note: toNullableString(row.note),
	};
}

function toNullableNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function normalizeAppointment(
	row: RawAppointment,
	serviceName: string | null,
	employeeName: string | null
): LastAppointment {
	return {
		id: String(row.id ?? ""),
		startTime: toNullableString(row.start_time ?? row.startTime),
		endTime: toNullableString(row.end_time ?? row.endTime),
		status: toNullableString(row.status),
		serviceName,
		employeeName,
		finalPrice: toNullableNumber(row.final_price ?? row.finalPrice),
		finalDurationMinutes: toNullableNumber(
			row.final_duration_minutes ?? row.finalDurationMinutes
		),
		clientNote: toNullableString(row.client_note ?? row.clientNote),
		staffNote: toNullableString(row.staff_note ?? row.staffNote),
		appointmentSource: toNullableString(row.appointment_source ?? row.appointmentSource),
	};
}

async function getSupabaseClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!supabaseUrl || !supabaseAnonKey) return null;

	return createClient(supabaseUrl, supabaseAnonKey);
}

async function getCustomer(id: string) {
	const supabase = await getSupabaseClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("customers")
		.select("id, name, phone, email, note")
		.eq("id", id)
		.single();

	if (error || !data) return null;
	return normalizeCustomer(data as RawCustomer);
}

async function getLastAppointment(customerId: string): Promise<LastAppointment | null> {
	const supabase = await getSupabaseClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("appointments")
		.select(
			"id, service_id, employee_id, start_time, end_time, status, final_price, final_duration_minutes, client_note, staff_note, appointment_source"
		)
		.eq("customer_id", customerId)
		.order("start_time", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error || !data) return null;

	const appointment = data as RawAppointment;
	const serviceId = appointment.service_id ? String(appointment.service_id) : "";
	const employeeId = appointment.employee_id ? String(appointment.employee_id) : "";

	const [serviceResult, employeeResult] = await Promise.all([
		serviceId
			? supabase.from("services").select("name").eq("id", serviceId).maybeSingle()
			: Promise.resolve({ data: null }),
		employeeId
			? supabase.from("employees").select("name").eq("id", employeeId).maybeSingle()
			: Promise.resolve({ data: null }),
	]);

	const serviceRow = serviceResult.data as RawAppointment | null;
	const employeeRow = employeeResult.data as RawAppointment | null;

	return normalizeAppointment(
		appointment,
		toNullableString(serviceRow?.name),
		toNullableString(employeeRow?.name)
	);
}

function formatDateTime(value: string | null) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";

	return new Intl.DateTimeFormat("it-IT", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function formatPrice(value: number | null) {
	if (value === null) return "—";
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
	}).format(value);
}

function formatAppointmentStatus(value: string | null) {
	if (value === "scheduled") return "Programmato";
	return value;
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
	return (
		<div>
			<p className="text-xs font-medium text-zinc-500">{label}</p>
			<p className="mt-1 text-sm text-zinc-900">{value ?? "—"}</p>
		</div>
	);
}

function CustomerSummaryCard({
	customer,
	lastAppointment,
}: {
	customer: CustomerData;
	lastAppointment: LastAppointment | null;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Scheda riepilogativa</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2">
					<DetailItem label="Cliente" value={customer.name} />
					<DetailItem label="Telefono" value={customer.phone} />
					<DetailItem label="Email" value={customer.email} />
					<DetailItem label="Note cliente" value={customer.note} />
				</div>

				<div className="border-t border-zinc-200 pt-5">
					<h2 className="text-sm font-semibold text-zinc-900">Ultimo appuntamento</h2>
					{lastAppointment ? (
							<div className="mt-4 grid gap-4 md:grid-cols-2">
								<DetailItem label="Inizio" value={formatDateTime(lastAppointment.startTime)} />
								<DetailItem label="Fine" value={formatDateTime(lastAppointment.endTime)} />
								<DetailItem label="Stato" value={formatAppointmentStatus(lastAppointment.status)} />
								<DetailItem label="Servizio" value={lastAppointment.serviceName} />
								<DetailItem label="Addetto" value={lastAppointment.employeeName} />
							<DetailItem
								label="Durata finale"
								value={
									lastAppointment.finalDurationMinutes !== null
										? `${lastAppointment.finalDurationMinutes} min`
										: null
								}
							/>
							<DetailItem label="Prezzo finale" value={formatPrice(lastAppointment.finalPrice)} />
							<DetailItem label="Origine" value={lastAppointment.appointmentSource} />
							<DetailItem label="Note cliente appuntamento" value={lastAppointment.clientNote} />
							<DetailItem label="Note staff" value={lastAppointment.staffNote} />
						</div>
					) : (
						<p className="mt-2 text-sm text-zinc-600">
							Nessun appuntamento registrato per questo cliente.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export default async function CustomerPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	if (id === "new") {
		return (
			<section className="mx-auto w-full max-w-2xl space-y-6">
				<header className="flex items-center justify-between gap-3">
					<h1 className="text-2xl font-semibold text-zinc-900">Nuovo Cliente</h1>
					<Link
						href="/admin/customers"
						className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
					>
						Torna ai clienti
					</Link>
				</header>
				<CustomerForm customer={null} />
			</section>
		);
	}

	const customer = await getCustomer(id);
	if (!customer) notFound();
	const lastAppointment = await getLastAppointment(customer.id);

	return (
		<section className="mx-auto w-full max-w-2xl space-y-6">
			<header className="flex items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold text-zinc-900">Modifica Cliente</h1>
				<Link
					href="/admin/customers"
					className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
				>
					Torna ai clienti
				</Link>
			</header>
			<CustomerForm customer={customer} />
			<CustomerSummaryCard customer={customer} lastAppointment={lastAppointment} />
		</section>
	);
}
