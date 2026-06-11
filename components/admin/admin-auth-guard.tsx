"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
	clearAdminSessionActivity,
	isAdminSessionTimedOut,
	markAdminSessionActivity,
} from "@/lib/admin-session-timeout";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		const supabase = getSupabaseBrowserClient();

		let mounted = true;
		let expiringSession = false;

		const redirectToLogin = () => {
			router.replace(`/login?next=${encodeURIComponent(pathname)}`);
		};

		const expireSession = async () => {
			if (expiringSession) {
				return;
			}

			expiringSession = true;
			clearAdminSessionActivity();
			await supabase.auth.signOut();
			if (mounted) {
				redirectToLogin();
			}
		};

		const bootstrap = async () => {
			const { data } = await supabase.auth.getSession();
			if (!mounted) {
				return;
			}

			if (!data.session) {
				redirectToLogin();
				return;
			}

			if (isAdminSessionTimedOut()) {
				await expireSession();
				return;
			}

			markAdminSessionActivity();
			setLoading(false);
		};

		void bootstrap();

		const handleActivity = () => {
			if (isAdminSessionTimedOut()) {
				void expireSession();
				return;
			}

			markAdminSessionActivity();
		};

		const activityEvents: Array<keyof WindowEventMap> = [
			"click",
			"keydown",
			"scroll",
			"touchstart",
		];

		activityEvents.forEach((eventName) => {
			window.addEventListener(eventName, handleActivity, { passive: true });
		});

		const timeoutId = window.setInterval(() => {
			if (isAdminSessionTimedOut()) {
				void expireSession();
			}
		}, 60 * 1000);

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session) {
				clearAdminSessionActivity();
				router.replace(`/login?next=${encodeURIComponent(pathname)}`);
			}
		});

		return () => {
			mounted = false;
			window.clearInterval(timeoutId);
			activityEvents.forEach((eventName) => {
				window.removeEventListener(eventName, handleActivity);
			});
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
