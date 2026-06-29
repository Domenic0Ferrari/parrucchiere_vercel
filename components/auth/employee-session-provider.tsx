"use client";

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
	bootstrapEmployeeSession,
	loadEmployeeForSession,
	signInEmployee,
	type Employee,
} from "@/lib/employee-session";
import { clearAdminSessionActivity } from "@/lib/admin-session-timeout";

type EmployeeSessionStatus = "loading" | "authenticated" | "unauthenticated";

type EmployeeSessionContextValue = {
	employee: Employee | null;
	status: EmployeeSessionStatus;
	isLoading: boolean;
	refreshEmployee: () => Promise<Employee | null>;
	signIn: (email: string, password: string) => Promise<Employee>;
	signOut: () => Promise<void>;
};

const EmployeeSessionContext = createContext<EmployeeSessionContextValue | null>(
	null
);

export function EmployeeSessionProvider({ children }: { children: ReactNode }) {
	const [employee, setEmployee] = useState<Employee | null>(null);
	const [status, setStatus] = useState<EmployeeSessionStatus>("loading");

	useEffect(() => {
		let mounted = true;
		const supabase = getSupabaseBrowserClient();

		const syncSession = async () => {
			try {
				const { data } = await supabase.auth.getSession();
				const currentEmployee = await loadEmployeeForSession(
					supabase,
					data.session
				);

				if (!mounted) {
					return;
				}

				setEmployee(currentEmployee);
				setStatus(currentEmployee ? "authenticated" : "unauthenticated");
			} catch {
				if (!mounted) {
					return;
				}

				setEmployee(null);
				setStatus("unauthenticated");
			}
		};

		void syncSession();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			void (async () => {
				try {
					const currentEmployee = await loadEmployeeForSession(supabase, session);

					if (!mounted) {
						return;
					}

					setEmployee(currentEmployee);
					setStatus(currentEmployee ? "authenticated" : "unauthenticated");
				} catch {
					if (!mounted) {
						return;
					}

					setEmployee(null);
					setStatus("unauthenticated");
				}
			})();
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, []);

	const value = useMemo<EmployeeSessionContextValue>(
		() => ({
			employee,
			status,
			isLoading: status === "loading",
			refreshEmployee: async () => {
				const currentEmployee = await bootstrapEmployeeSession();
				setEmployee(currentEmployee);
				setStatus(currentEmployee ? "authenticated" : "unauthenticated");
				return currentEmployee;
			},
			signIn: async (email, password) => {
				const currentEmployee = await signInEmployee(email, password);
				setEmployee(currentEmployee);
				setStatus("authenticated");
				return currentEmployee;
			},
			signOut: async () => {
				const supabase = getSupabaseBrowserClient();
				clearAdminSessionActivity();
				await supabase.auth.signOut();
				setEmployee(null);
				setStatus("unauthenticated");
			},
		}),
		[employee, status]
	);

	return (
		<EmployeeSessionContext.Provider value={value}>
			{children}
		</EmployeeSessionContext.Provider>
	);
}

export function useEmployeeSession() {
	const context = useContext(EmployeeSessionContext);

	if (!context) {
		throw new Error("useEmployeeSession deve essere usato dentro EmployeeSessionProvider.");
	}

	return context;
}
