import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			"peer size-5 shrink-0 rounded-sm border-2 border-black dark:border-white",
			"bg-white dark:bg-black",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"data-[state=checked]:bg-[#FFD93D] data-[state=checked]:border-black dark:data-[state=checked]:border-white",
			"transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,1)]",
			className,
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-black")}>
			<Check className="size-4 stroke-[3px]" />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
