"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SalonManagementPage } from "@/components/admin/salon-management-page";
import { useAuthSession } from "@/components/auth/employee-session-provider";

export default function AdminSalonPage() {
	const router = useRouter();
	const { user, isLoading } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";

	useEffect(() => {
		if (!isLoading && !isAdmin) {
			router.replace("/admin/dashboard");
		}
	}, [isAdmin, isLoading, router]);

	if (isLoading || !isAdmin) {
		return null;
	}

	return <SalonManagementPage />;
}
