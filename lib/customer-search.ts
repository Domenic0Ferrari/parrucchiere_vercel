import type { CustomerItem } from "@/app/admin/customers/page";

export function matchesCustomerSearch(customer: CustomerItem, search: string): boolean {
	const term = search.trim().toLocaleLowerCase("it-IT");
	if (!term) return true;

	const values = [customer.name, customer.phone ?? "", customer.email ?? ""];
	if (values.some((value) => value.toLocaleLowerCase("it-IT").includes(term))) return true;

	if (!/^[\d\s()+.-]+$/.test(term)) return false;
	const digits = term.replace(/\D/g, "");
	return digits.length >= 3 && (customer.phone ?? "").replace(/\D/g, "").includes(digits);
}
