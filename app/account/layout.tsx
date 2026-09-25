import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
	return <div className="min-h-[calc(100dvh-var(--navbar-height))] bg-zinc-50">{children}</div>;
}
