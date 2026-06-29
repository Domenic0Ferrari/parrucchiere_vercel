"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEmployeeSession } from "@/components/auth/employee-session-provider";

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { employee, isLoading } = useEmployeeSession();

	useEffect(() => {
		const redirectToLogin = () => {
			router.replace(`/login?next=${encodeURIComponent(pathname)}`);
		};

		if (isLoading) {
			return;
		}

		if (!employee) {
			redirectToLogin();
			return;
		}
	}, [employee, isLoading, pathname, router]);

	if (isLoading || !employee) {
		return (
			<div className="flex min-h-[calc(100dvh-var(--navbar-height))] items-center justify-center bg-zinc-50">
				<p className="text-sm text-zinc-600">Verifica sessione in corso...</p>
			</div>
		);
	}

	return <>{children}</>;
}
