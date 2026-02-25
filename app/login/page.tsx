import type { Metadata } from "next";

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
				<section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
					<p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
						Area Riservata
					</p>
					<h1 className="mt-2 text-2xl font-semibold text-zinc-900">
						Login Owner
					</h1>
					<p className="mt-2 text-sm text-zinc-600">
						Pagina accessibile solo tramite URL diretto.
					</p>

					<form className="mt-6 space-y-4" method="post">
						<div>
							<label
								htmlFor="owner-email"
								className="mb-1.5 block text-sm font-semibold text-zinc-900"
							>
								Email
							</label>
							<input
								id="owner-email"
								name="email"
								type="email"
								required
								autoComplete="username"
								placeholder="owner@salone.it"
								className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
							/>
						</div>

						<div>
							<label
								htmlFor="owner-password"
								className="mb-1.5 block text-sm font-semibold text-zinc-900"
							>
								Password
							</label>
							<input
								id="owner-password"
								name="password"
								type="password"
								required
								autoComplete="current-password"
								placeholder="Inserisci la password"
								className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
							/>
						</div>

						<button
							type="submit"
							className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
						>
							Accedi
						</button>
					</form>
				</section>
			</main>
		</div>
	);
}
