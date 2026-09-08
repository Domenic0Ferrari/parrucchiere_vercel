"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({ className = "", align = "center", sideOffset = 4, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				sideOffset={sideOffset}
				className={`z-[100] rounded-xl border border-zinc-200 bg-white p-3 shadow-xl shadow-zinc-950/10 outline-none ${className}`}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
