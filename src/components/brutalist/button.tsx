import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { Button as UIButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BrutalistButtonProps extends ComponentPropsWithoutRef<typeof UIButton> {}

export const Button = forwardRef<HTMLButtonElement, BrutalistButtonProps>(
	({ className, variant = "default", ...props }, ref) => {
		// Determine Brutalist colors based on variant
		const brutalistClasses = cn(
			"border-2 border-black dark:border-white rounded-lg font-bold",
			"brutalist-shadow brutalist-shadow-hover",
			"transition-all duration-150",
			{
				// Default: Yellow background
				"brutalist-yellow hover:brutalist-yellow": variant === "default",
				// Destructive: Red background
				"brutalist-red hover:brutalist-red": variant === "destructive",
				// Outline: White/Black background with border
				"bg-white dark:bg-black hover:brutalist-cyan": variant === "outline",
				// Secondary: Cyan background
				"brutalist-cyan hover:brutalist-cyan": variant === "secondary",
				// Ghost: No background, just border
				"bg-transparent border-2 hover:bg-gray-100 dark:hover:bg-gray-800": variant === "ghost",
				// Link: No special styling
				"border-0 shadow-none": variant === "link",
			},
			className,
		);

		return <UIButton ref={ref} variant={variant} className={brutalistClasses} {...props} />;
	},
);

Button.displayName = "BrutalistButton";
