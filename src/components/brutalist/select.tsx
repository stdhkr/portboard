import {
	SelectContent as SelectContentBase,
	SelectGroup as SelectGroupBase,
	SelectItem as SelectItemBase,
	Select as SelectRoot,
	SelectTrigger as SelectTriggerBase,
	SelectValue as SelectValueBase,
} from "@/components/ui/select";

// Brutalist Select wrapper exports
export const Select = SelectRoot;
export const SelectGroup = SelectGroupBase;
export const SelectValue = SelectValueBase;

// Brutalist SelectTrigger with custom styling
export const SelectTrigger = ({
	className = "",
	...props
}: React.ComponentProps<typeof SelectTriggerBase>) => {
	return (
		<SelectTriggerBase
			className={`border-2 border-black dark:border-white bg-white dark:bg-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] dark:shadow-[3px_3px_0_0_rgba(255,255,255,1)] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0_0_rgba(255,255,255,1)] transition-all ${className}`}
			{...props}
		/>
	);
};

// Brutalist SelectContent with custom styling
export const SelectContent = ({
	className = "",
	...props
}: React.ComponentProps<typeof SelectContentBase>) => {
	return (
		<SelectContentBase
			className={`border-2 border-black dark:border-white bg-white dark:bg-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] dark:shadow-[3px_3px_0_0_rgba(255,255,255,1)] ${className}`}
			{...props}
		/>
	);
};

// Brutalist SelectItem with custom styling
export const SelectItem = ({
	className = "",
	...props
}: React.ComponentProps<typeof SelectItemBase>) => {
	return (
		<SelectItemBase
			className={`hover:bg-yellow-200 dark:hover:bg-yellow-900 focus:bg-yellow-200 dark:focus:bg-yellow-900 ${className}`}
			{...props}
		/>
	);
};
