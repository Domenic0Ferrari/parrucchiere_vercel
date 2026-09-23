import type { ReactNode } from "react";
import { requireAdminEmployee } from "@/lib/admin-auth-server";

export default async function AdminReviewsLayout({ children }: { children: ReactNode }) {
	await requireAdminEmployee();
	return children;
}
