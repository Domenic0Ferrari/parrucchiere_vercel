"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

function Calendar({ className, classNames, showOutsideDays = true, components, ...props }: DayPickerProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-1", className)}
			classNames={{
				root: "text-zinc-900",
				months: "flex flex-col",
				month: "space-y-3",
				month_caption: "flex h-9 items-center justify-center",
				caption_label: "text-sm font-semibold capitalize",
				nav: "flex items-center justify-between",
				button_previous: "absolute left-1 top-1 inline-flex size-8 items-center justify-center rounded-md hover:bg-zinc-100",
				button_next: "absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-md hover:bg-zinc-100",
				month_grid: "w-full border-collapse",
				weekdays: "flex",
				weekday: "w-9 text-center text-[0.7rem] font-medium text-zinc-500",
				week: "mt-1 flex w-full",
				day: "size-9 p-0 text-center",
				day_button: "inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
				selected: "[&>button]:bg-zinc-900 [&>button]:text-white [&>button]:hover:bg-zinc-800",
				today: "[&>button]:font-bold [&>button]:text-zinc-900",
				outside: "text-zinc-300",
				disabled: "text-zinc-300 opacity-50",
				...classNames,
			}}
			components={{
				Chevron: ({ orientation, className: iconClassName }) => orientation === "left"
					? <ChevronLeft className={cn("size-4", iconClassName)} />
					: <ChevronRight className={cn("size-4", iconClassName)} />,
				...components,
			}}
			{...props}
		/>
	);
}

export { Calendar };
