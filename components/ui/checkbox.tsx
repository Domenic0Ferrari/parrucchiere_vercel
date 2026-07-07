"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.ComponentProps<"button">, "onChange"> & {
	checked: boolean;
	onCheckedChange?: (checked: boolean) => void;
};

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
	({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
		<button
			ref={ref}
			type="button"
			role="checkbox"
			aria-checked={checked}
			disabled={disabled}
			className={cn(
				"flex h-5 w-5 shrink-0 items-center justify-center rounded border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
				checked
					? "border-zinc-900 bg-zinc-900 text-white"
					: "border-zinc-300 bg-white text-transparent",
				className
			)}
			onClick={() => onCheckedChange?.(!checked)}
			{...props}
		>
			<Check className="h-3.5 w-3.5" />
		</button>
	)
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
