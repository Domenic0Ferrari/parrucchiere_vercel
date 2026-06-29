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
	bootstrapUserSession,
	loadUserForSession,
	signInUser,
	type AppUser,
} from "@/lib/employee-session";

type AuthSessionStatus = "loading" | "authenticated" | "unauthenticated";

type AuthSessionContextValue = {
	user: AppUser | null;
	status: AuthSessionStatus;
	isLoading: boolean;
	refreshUser: () => Promise<AppUser | null>;
	signIn: (email: string, password: string) => Promise<AppUser>;
	signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AppUser | null>(null);
	const [status, setStatus] = useState<AuthSessionStatus>("loading");

	useEffect(() => {
		let mounted = true;
		const supabase = getSupabaseBrowserClient();

		const syncSession = async () => {
			try {
				const { data } = await supabase.auth.getSession();
				const currentUser = await loadUserForSession(supabase, data.session);

				if (!mounted) {
					return;
				}

				setUser(currentUser);
				setStatus(currentUser ? "authenticated" : "unauthenticated");
			} catch {
				if (!mounted) {
					return;
				}

				setUser(null);
				setStatus("unauthenticated");
			}
		};

		void syncSession();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			void (async () => {
				try {
					const currentUser = await loadUserForSession(supabase, session);

					if (!mounted) {
						return;
					}

					setUser(currentUser);
					setStatus(currentUser ? "authenticated" : "unauthenticated");
				} catch {
					if (!mounted) {
						return;
					}

					setUser(null);
					setStatus("unauthenticated");
				}
			})();
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, []);

	const value = useMemo<AuthSessionContextValue>(
		() => ({
			user,
			status,
			isLoading: status === "loading",
			refreshUser: async () => {
				const currentUser = await bootstrapUserSession();
				setUser(currentUser);
				setStatus(currentUser ? "authenticated" : "unauthenticated");
				return currentUser;
			},
			signIn: async (email, password) => {
				const currentUser = await signInUser(email, password);
				setUser(currentUser);
				setStatus("authenticated");
				return currentUser;
			},
			signOut: async () => {
				const supabase = getSupabaseBrowserClient();
				await supabase.auth.signOut();
				setUser(null);
				setStatus("unauthenticated");
			},
		}),
		[user, status]
	);

	return (
		<AuthSessionContext.Provider value={value}>
			{children}
		</AuthSessionContext.Provider>
	);
}

export function useAuthSession() {
	const context = useContext(AuthSessionContext);

	if (!context) {
		throw new Error("useAuthSession deve essere usato dentro AuthSessionProvider.");
	}

	return context;
}
