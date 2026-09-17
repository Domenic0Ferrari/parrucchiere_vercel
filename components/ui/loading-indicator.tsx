import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingIndicatorProps = {
	label?: string;
	className?: string;
};

function LoadingIndicator({
	label = "Caricamento in corso...",
	className,
}: LoadingIndicatorProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn("flex items-center justify-center gap-2 text-sm text-zinc-600", className)}
		>
			<LoaderCircle aria-hidden="true" className="size-5 animate-spin text-brand" />
			<span>{label}</span>
		</div>
	);
}

export { LoadingIndicator };
