import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth/employee-session-provider";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
	title: "Il tuo salone",
	description: "Prenota e gestisci i tuoi appuntamenti online.",
	icons: {
		icon: "/icon.png",
		shortcut: "/icon.png",
		apple: "/icon.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="it">
			<body className="antialiased">
				<AuthSessionProvider>
					<Navbar />
					{children}
					<Toaster richColors position="bottom-right" />
				</AuthSessionProvider>
			</body>
		</html>
	);
}
