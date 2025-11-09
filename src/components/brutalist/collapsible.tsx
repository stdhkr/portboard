import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface BrutalistCollapsibleProps {
	title: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
	className?: string;
}

export function BrutalistCollapsible({
	title,
	children,
	defaultOpen = false,
	className,
}: BrutalistCollapsibleProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
			<CollapsibleTrigger className="group flex w-full items-center justify-between rounded-none border-2 border-black bg-transparent px-4 py-3 font-mono font-bold uppercase transition-all hover:bg-black/5 dark:border-white dark:hover:bg-white/5">
				<span>{title}</span>
				<ChevronDown
					className={cn("h-5 w-5 transition-transform duration-200", isOpen && "rotate-180")}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="border-2 border-t-0 border-black bg-transparent px-4 pt-0 pb-4 dark:border-white">
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}
