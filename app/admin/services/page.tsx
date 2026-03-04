import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminServicesPage() {
	return (
		<section className="space-y-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900">Servizi</h1>
					<p className="mt-1 text-sm text-zinc-600">
						Gestisci i servizi del tuo salone.
					</p>
				</div>
				<Button>Aggiungi Servizio</Button>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Lista Servizi</CardTitle>
					<CardDescription>
						Collega questa tabella al database per mostrare i prodotti reali.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-zinc-600">Nessun servizio disponibile.</p>
				</CardContent>
			</Card>
		</section>
	);
}
