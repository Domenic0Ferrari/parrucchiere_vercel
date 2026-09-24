import type { ReactNode } from "react";
import { customerPortalMode } from "@/lib/customer-account";

export default function AccountLayout({ children }: { children: ReactNode }) {
	if (customerPortalMode() === "off") return <main className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Area clienti in preparazione</h1><p className="mt-3 text-zinc-600">Per gestire una prenotazione contatta il salone.</p></main>;
	return <div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50">{children}</div>;
}
