import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/brutalist";

export function LanguageToggle() {
	const { i18n } = useTranslation();
	const currentLanguage = i18n.language.startsWith("ja") ? "ja" : "en";

	const handleLanguageChange = (value: string) => {
		i18n.changeLanguage(value);
	};

	return (
		<Select value={currentLanguage} onValueChange={handleLanguageChange}>
			<SelectTrigger className="h-8 text-sm">
				<div className="flex items-center gap-2 mr-2">
					<Globe className="h-4 w-4" />
					<SelectValue />
				</div>
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="en">English</SelectItem>
				<SelectItem value="ja">日本語</SelectItem>
			</SelectContent>
		</Select>
	);
}
