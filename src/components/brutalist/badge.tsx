import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
	variant?: "default" | "success" | "warning" | "danger" | "info";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant = "default", children, ...props }, ref) => {
		const variantClasses = {
			default: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
			success: "brutalist-cyan",
			warning: "brutalist-yellow",
			danger: "brutalist-red",
			info: "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100",
		};

		return (
			<span
				ref={ref}
				className={cn(
					"brutalist-badge inline-flex items-center",
					variantClasses[variant],
					className,
				)}
				{...props}
			>
				{children}
			</span>
		);
	},
);

Badge.displayName = "BrutalistBadge";
