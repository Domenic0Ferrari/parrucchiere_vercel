import type { Metadata } from "next";
import { Suspense } from "react";
import OwnerLoginForm from "./LoginForm";

export const metadata: Metadata = {
	title: "Owner Login",
	description: "Accesso riservato al proprietario",
	robots: {
		index: false,
		follow: false,
	},
};

export default function OwnerLoginPage() {
	return (
		<div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-100 px-4 py-8 sm:px-6">
			<main className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center">
				<Suspense
					fallback={
						<section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
							<p className="text-sm text-zinc-600">Caricamento...</p>
						</section>
					}
				>
					<OwnerLoginForm />
				</Suspense>
			</main>
		</div>
	);
}
