import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Brutalist Tooltip wrapper
 * Wraps Radix UI Tooltip with Neo Brutalism styling (no arrow)
 */
function TooltipProvider({
	delayDuration = 0,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
	return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

function Tooltip({ children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	return (
		<TooltipProvider>
			<TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
		</TooltipProvider>
	);
}

function TooltipTrigger({
	children,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger {...props}>{children}</TooltipPrimitive.Trigger>;
}

function TooltipContent({
	className,
	children,
	sideOffset = 8,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				sideOffset={sideOffset}
				className={cn(
					// Neo Brutalism styling (lighter than buttons)
					"border border-black dark:border-white",
					"bg-white dark:bg-black",
					"text-black dark:text-white",
					"shadow-[0px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0px_2px_0px_0px_rgba(255,255,255,1)]",
					"rounded-md",
					"font-mono text-xs",
					"px-3 py-1.5",
					// Animation
					"animate-in fade-in-0 zoom-in-95",
					"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
					"data-[side=bottom]:slide-in-from-top-2",
					"data-[side=left]:slide-in-from-right-2",
					"data-[side=right]:slide-in-from-left-2",
					"data-[side=top]:slide-in-from-bottom-2",
					"z-50",
					className,
				)}
				{...props}
			>
				{children}
				{/* No Arrow - Neo Brutalism style */}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
