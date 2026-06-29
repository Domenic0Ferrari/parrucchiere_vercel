"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/employee-session-provider";

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { user, isLoading } = useAuthSession();

	useEffect(() => {
		const redirectToLogin = () => {
			router.replace(`/login?next=${encodeURIComponent(pathname)}`);
		};

		if (isLoading) {
			return;
		}

		if (!user) {
			redirectToLogin();
			return;
		}
	}, [isLoading, pathname, router, user]);

	if (isLoading || !user) {
		return (
			<div className="flex min-h-[calc(100dvh-var(--navbar-height))] items-center justify-center bg-zinc-50">
				<p className="text-sm text-zinc-600">Verifica sessione in corso...</p>
			</div>
		);
	}

	return <>{children}</>;
}
