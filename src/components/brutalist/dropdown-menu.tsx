import {
	DropdownMenuContent as DropdownMenuContentBase,
	DropdownMenuGroup as DropdownMenuGroupBase,
	DropdownMenuItem as DropdownMenuItemBase,
	DropdownMenuLabel as DropdownMenuLabelBase,
	DropdownMenu as DropdownMenuRoot,
	DropdownMenuSeparator as DropdownMenuSeparatorBase,
	DropdownMenuTrigger as DropdownMenuTriggerBase,
} from "@/components/ui/dropdown-menu";

// Brutalist DropdownMenu wrapper exports
export const DropdownMenu = DropdownMenuRoot;
export const DropdownMenuTrigger = DropdownMenuTriggerBase;
export const DropdownMenuGroup = DropdownMenuGroupBase;
export const DropdownMenuLabel = DropdownMenuLabelBase;
export const DropdownMenuSeparator = DropdownMenuSeparatorBase;

// Brutalist DropdownMenuContent with custom styling
export const DropdownMenuContent = ({
	className = "",
	...props
}: React.ComponentProps<typeof DropdownMenuContentBase>) => {
	return (
		<DropdownMenuContentBase
			className={`border-2 border-black dark:border-white bg-white dark:bg-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] dark:shadow-[3px_3px_0_0_rgba(255,255,255,1)] ${className}`}
			{...props}
		/>
	);
};

// Brutalist DropdownMenuItem with custom styling
export const DropdownMenuItem = ({
	className = "",
	...props
}: React.ComponentProps<typeof DropdownMenuItemBase>) => {
	return (
		<DropdownMenuItemBase
			className={`hover:bg-yellow-200 dark:hover:bg-yellow-900 focus:bg-yellow-200 dark:focus:bg-yellow-900 cursor-pointer ${className}`}
			{...props}
		/>
	);
};
