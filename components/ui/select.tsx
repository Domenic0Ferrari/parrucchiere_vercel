"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

function Select({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				"data-[size=default]:h-10 data-[size=sm]:h-8 [&_svg:not([class*='text-'])]:text-zinc-600 flex w-fit items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm whitespace-nowrap text-zinc-900 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:px-3 data-[size=sm]:px-2",
				"[&>span]:text-zinc-900",
				"[&>span[data-placeholder]]:text-zinc-600",
				"w-full",
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDown className="h-4 w-4 opacity-60" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	position = "popper",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				className={cn(
					"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-md",
					position === "popper" &&
					"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				position={position}
				{...props}
			>
				<SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
					<ChevronUp className="h-4 w-4" />
				</SelectPrimitive.ScrollUpButton>
				<SelectPrimitive.Viewport
					className={cn(
						"p-1",
						position === "popper" &&
						"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
					<ChevronDown className="h-4 w-4" />
				</SelectPrimitive.ScrollDownButton>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn("px-2 py-1.5 text-xs font-medium text-zinc-500", className)}
			{...props}
		/>
	);
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex w-full cursor-default items-center gap-2 rounded-lg py-1.5 pr-8 pl-2 text-sm text-zinc-900 outline-none select-none focus:bg-zinc-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<span className="pointer-events-none absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<Check className="h-4 w-4" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn("bg-muted pointer-events-none -mx-1 my-1 h-px", className)}
			{...props}
		/>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
