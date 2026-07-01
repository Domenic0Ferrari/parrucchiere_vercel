"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
	open: boolean;
	title: string;
	description: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: "default" | "destructive";
	isLoading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Conferma",
	cancelLabel = "Annulla",
	confirmVariant = "default",
	isLoading = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const cancelRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!open) return;

		cancelRef.current?.focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !isLoading) {
				onCancel();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open, isLoading, onCancel]);

	if (!open || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-black/40"
				aria-hidden
				onClick={isLoading ? undefined : onCancel}
			/>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-dialog-title"
				aria-describedby="confirm-dialog-description"
				className="relative z-[201] w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
			>
				<h2 id="confirm-dialog-title" className="text-lg font-semibold text-zinc-900">
					{title}
				</h2>
				<p id="confirm-dialog-description" className="mt-2 text-sm text-zinc-600">
					{description}
				</p>
				<div className="mt-6 flex justify-end gap-3">
					<Button
						ref={cancelRef}
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isLoading}
						className="border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
					>
						{cancelLabel}
					</Button>
					<Button
						type="button"
						onClick={onConfirm}
						disabled={isLoading}
						className={cn(
							confirmVariant === "destructive" &&
								"bg-red-700 text-white hover:bg-red-800"
						)}
					>
						{isLoading ? "Attendere..." : confirmLabel}
					</Button>
				</div>
			</div>
		</div>,
		document.body
	);
}
