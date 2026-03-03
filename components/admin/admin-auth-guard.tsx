"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		const supabase = getSupabaseBrowserClient();

		let mounted = true;

		const bootstrap = async () => {
			const { data } = await supabase.auth.getSession();
			if (!mounted) {
				return;
			}

			if (!data.session) {
				router.replace(`/login?next=${encodeURIComponent(pathname)}`);
				return;
			}

			setLoading(false);
		};

		void bootstrap();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session) {
				router.replace("/login");
			}
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, [pathname, router]);

	if (loading) {
		return (
			<div className="flex min-h-[calc(100dvh-var(--navbar-height))] items-center justify-center bg-zinc-50">
				<p className="text-sm text-zinc-600">Verifica sessione in corso...</p>
			</div>
		);
	}

	return <>{children}</>;
}
