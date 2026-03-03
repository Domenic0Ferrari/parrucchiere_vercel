import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
				<p className="mt-1 text-sm text-zinc-600">
					Panoramica veloce dell&apos;area amministratore.
				</p>
			</header>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Appuntamenti Oggi</CardTitle>
						<CardDescription>Stato giornaliero prenotazioni</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold text-zinc-900">0</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Clienti Nuovi</CardTitle>
						<CardDescription>Registrazioni ultime 24 ore</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold text-zinc-900">0</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Prodotti in Catalogo</CardTitle>
						<CardDescription>Gestione inventario online</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold text-zinc-900">0</p>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
