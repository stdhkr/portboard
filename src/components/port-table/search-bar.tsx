import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
	const { t } = useTranslation();

	return (
		<div className="relative max-w-md">
			<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
			<input
				type="text"
				placeholder={t("search.placeholder")}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full rounded-lg border-2 border-black dark:border-white bg-white dark:bg-gray-900 py-2 pl-10 pr-4 font-mono text-sm text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD93D] brutalist-shadow"
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange("")}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}
