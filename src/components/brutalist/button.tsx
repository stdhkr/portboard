import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { Button as UIButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BrutalistButtonProps extends ComponentPropsWithoutRef<typeof UIButton> {}

export const Button = forwardRef<HTMLButtonElement, BrutalistButtonProps>(
	({ className, variant = "default", ...props }, ref) => {
		// Determine Brutalist colors based on variant
		const brutalistClasses = cn(
			"rounded-lg font-bold transition-all duration-150",
			{
				// Default: Yellow background
				"brutalist-yellow hover:brutalist-yellow border-2 border-black dark:border-white brutalist-shadow brutalist-shadow-hover": variant === "default",
				// Destructive: Red background
				"brutalist-red hover:brutalist-red border-2 border-black dark:border-white brutalist-shadow brutalist-shadow-hover": variant === "destructive",
				// Outline: White/Black background with border
				"bg-white dark:bg-black hover:brutalist-cyan border-2 border-black dark:border-white brutalist-shadow brutalist-shadow-hover": variant === "outline",
				// Secondary: Cyan background
				"brutalist-cyan hover:brutalist-cyan border-2 border-black dark:border-white brutalist-shadow brutalist-shadow-hover": variant === "secondary",
				// Ghost: Transparent border normally, black border on hover
				"bg-transparent border-2 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 hover:border-black dark:hover:border-white": variant === "ghost",
				// Link: No special styling
				"border-0 shadow-none": variant === "link",
			},
			className,
		);

		return <UIButton ref={ref} variant={variant} className={brutalistClasses} {...props} />;
	},
);

Button.displayName = "BrutalistButton";
