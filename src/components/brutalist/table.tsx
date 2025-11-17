import { type ComponentPropsWithoutRef, forwardRef } from "react";
import {
	TableBody,
	TableHeader,
	Table as UITable,
	TableCell as UITableCell,
	TableHead as UITableHead,
	TableRow as UITableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Table wrapper
export const Table = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<typeof UITable>>(
	({ className, ...props }, ref) => {
		return (
			<UITable
				ref={ref}
				className={cn("brutalist-table rounded-lg overflow-hidden", className)}
				{...props}
			/>
		);
	},
);

Table.displayName = "BrutalistTable";

// TableHeader - no changes needed, just re-export
export { TableHeader, TableBody };

// TableHead wrapper
export const TableHead = forwardRef<
	HTMLTableCellElement,
	ComponentPropsWithoutRef<typeof UITableHead>
>(({ className, ...props }, ref) => {
	return (
		<UITableHead
			ref={ref}
			className={cn(
				"border-b-3 border-black dark:border-white! bg-gray-100 dark:bg-gray-800 font-bold",
				className,
			)}
			{...props}
		/>
	);
});

TableHead.displayName = "BrutalistTableHead";

// TableRow wrapper
export const TableRow = forwardRef<
	HTMLTableRowElement,
	ComponentPropsWithoutRef<typeof UITableRow>
>(({ className, ...props }, ref) => {
	return (
		<UITableRow
			ref={ref}
			className={cn(
				"border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900",
				className,
			)}
			{...props}
		/>
	);
});

TableRow.displayName = "BrutalistTableRow";

// TableCell wrapper
export const TableCell = forwardRef<
	HTMLTableCellElement,
	ComponentPropsWithoutRef<typeof UITableCell>
>(({ className, ...props }, ref) => {
	return <UITableCell ref={ref} className={cn("", className)} {...props} />;
});

TableCell.displayName = "BrutalistTableCell";
