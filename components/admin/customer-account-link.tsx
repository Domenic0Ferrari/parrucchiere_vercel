"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CustomerAccountLink({ customerId }: { customerId: string }) {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [saving, setSaving] = useState(false);
	return <section className="rounded-xl border border-zinc-200 bg-white p-5">
		<h2 className="font-semibold text-zinc-900">Collega a un account cliente</h2>
		<p className="mt-1 text-sm text-zinc-600">Usa questa funzione dopo aver verificato l&apos;identità del cliente. Le sue prenotazioni passeranno all&apos;account indicato e questo contatto verrà disattivato.</p>
		<form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={async (event) => {
			event.preventDefault(); setSaving(true);
			try {
				const response = await fetch(`/api/admin/customers/${customerId}/link-account`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
				const result = await response.json() as { error?: string };
				if (!response.ok) throw new Error(result.error ?? "Collegamento non riuscito.");
				toast.success("Prenotazioni collegate all'account cliente."); router.push("/admin/customers"); router.refresh();
			} catch (error) { toast.error(error instanceof Error ? error.message : "Collegamento non riuscito."); }
			finally { setSaving(false); }
		}}>
			<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email dell'account cliente" aria-label="Email dell'account cliente" className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-3 text-sm" />
			<button disabled={saving} className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Collegamento..." : "Collega prenotazioni"}</button>
		</form>
	</section>;
}
