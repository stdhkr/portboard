import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Brutalist-styled toast notifications using Sonner
 *
 * Features:
 * - Bold borders (2px) with offset shadows (3px)
 * - High-contrast colors matching brutalist design system
 * - Dark mode support
 * - Neo Brutalism aesthetic
 */
export function Toaster({ ...props }: ToasterProps) {
	return (
		<Sonner
			theme="system"
			className="toaster group"
			closeButton
			toastOptions={{
				classNames: {
					toast:
						"group toast font-mono bg-white dark:bg-gray-900 text-black dark:text-white border-2 border-black dark:border-white rounded-lg brutalist-shadow p-4 !gap-4 relative",
					description: "text-sm text-gray-600 dark:text-gray-400 font-mono",
					closeButton: "!absolute !right-1 !top-4 !bg-transparent !border-0 !text-black !left-auto",
					actionButton:
						"brutalist-border brutalist-shadow brutalist-yellow font-bold font-mono px-3 py-1.5 rounded",
					cancelButton:
						"brutalist-border brutalist-shadow bg-white dark:bg-gray-900 font-bold font-mono px-3 py-1.5 rounded",
					error: "!bg-[#ff6b6b] !text-white !border-black dark:!border-white",
					success: "!bg-[#6bcf7e] !text-black !border-black dark:!border-white",
					warning: "!bg-[#ffd93d] !text-black !border-black dark:!border-white",
					info: "!bg-white dark:!bg-gray-900 !text-black dark:!text-white !border-black dark:!border-white",
				},
			}}
			{...props}
		/>
	);
}
