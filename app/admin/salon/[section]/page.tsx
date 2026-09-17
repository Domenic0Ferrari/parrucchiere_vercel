"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	SalonManagementPage,
	salonManagementSections,
	type SalonManagementSection,
} from "@/components/admin/salon-management-page";
import { useAuthSession } from "@/components/auth/employee-session-provider";

function isSalonManagementSection(value: string | undefined): value is SalonManagementSection {
	return value !== undefined && salonManagementSections.includes(value as SalonManagementSection);
}

export default function AdminSalonSectionPage() {
	const router = useRouter();
	const params = useParams<{ section?: string }>();
	const { user, isLoading } = useAuthSession();
	const isAdmin = user?.employee.role === "admin";
	const section = params.section;
	const isValidSection = isSalonManagementSection(section);

	useEffect(() => {
		if (isLoading) return;
		if (!isAdmin) {
			router.replace("/admin/dashboard");
			return;
		}
		if (!isValidSection) router.replace("/admin/salon");
	}, [isAdmin, isLoading, isValidSection, router]);

	if (isLoading || !isAdmin || !isValidSection) return null;

	return <SalonManagementPage section={section} />;
}
