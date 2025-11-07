import { type ComponentPropsWithoutRef, forwardRef } from "react";
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Dialog as UIDialog,
	DialogContent as UIDialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Dialog root - no changes needed
export const Dialog = UIDialog;

// DialogTrigger - no changes needed
export { DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter };

// DialogContent wrapper with Brutalist styling
export const DialogContent = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof UIDialogContent>
>(({ className, ...props }, ref) => {
	return (
		<UIDialogContent
			ref={ref}
			className={cn(
				"brutalist-dialog-content",
				"border-3 border-black dark:border-white",
				"bg-white dark:bg-black",
				className,
			)}
			{...props}
		/>
	);
});

DialogContent.displayName = "BrutalistDialogContent";
