import type { Metadata } from "next";
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
				<OwnerLoginForm />
			</main>
		</div>
	);
}
