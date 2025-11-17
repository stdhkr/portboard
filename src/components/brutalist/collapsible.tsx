import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface BrutalistCollapsibleProps {
	title: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	className?: string;
}

export function BrutalistCollapsible({
	title,
	children,
	defaultOpen = false,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	className,
}: BrutalistCollapsibleProps) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);

	// Use controlled state if provided, otherwise use internal state
	const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
	const setIsOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
			<CollapsibleTrigger
				className={cn(
					"group flex w-full items-center justify-between rounded-lg border-2 border-black bg-transparent px-3 py-1.5 text-sm font-mono font-bold uppercase transition-all hover:bg-black/5 focus-visible:outline-none dark:border-white dark:hover:bg-white/5",
					isOpen && "rounded-b-none",
				)}
			>
				<span>{title}</span>
				<ChevronDown
					className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="border-2 border-t-0 border-black rounded-b-lg bg-transparent px-4 pt-0 pb-4 dark:border-white shadow-[0px_2px_0px_rgba(0,0,0,1)] dark:shadow-[0px_2px_0px_rgba(255,255,255,1)]">
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}
