"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ComponentProps<"button">, "onChange"> & {
	checked: boolean;
	onCheckedChange?: (checked: boolean) => void;
};

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
	({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
		<button
			ref={ref}
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			className={cn(
				"inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
				checked ? "bg-zinc-900" : "bg-zinc-300",
				className
			)}
			onClick={() => onCheckedChange?.(!checked)}
			{...props}
		>
			<span
				className={cn(
					"pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
					checked ? "translate-x-5" : "translate-x-0.5"
				)}
			/>
		</button>
	)
);
Switch.displayName = "Switch";

export { Switch };
