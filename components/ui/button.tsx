import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost";
type Size = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
}

function buttonVariants({
	variant = "default",
	size = "default",
	className,
}: {
	variant?: Variant;
	size?: Size;
	className?: string;
}) {
	const variantClass =
		variant === "outline"
			? "border border-zinc-300 bg-white hover:bg-zinc-100"
			: variant === "ghost"
				? "hover:bg-zinc-100"
				: "bg-zinc-900 text-white hover:bg-zinc-800";

	const sizeClass =
		size === "sm"
			? "h-8 rounded-md px-3 text-xs"
			: size === "lg"
				? "h-11 rounded-md px-8"
				: size === "icon"
					? "h-9 w-9"
					: "h-10 px-4 py-2";

	return cn(
		"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
		variantClass,
		sizeClass,
		className
	);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, ...props }, ref) => {
		return (
			<button
				className={buttonVariants({ variant, size, className })}
				ref={ref}
				{...props}
			/>
		);
	}
);
Button.displayName = "Button";

export { Button, buttonVariants };
