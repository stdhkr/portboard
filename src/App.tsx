import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/brutalist";
import { PortTable } from "@/components/port-table";
import { LanguageToggle } from "@/components/settings/language-toggle";
import { NotificationToggle } from "@/components/settings/notification-toggle";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { UI } from "@/config/constants";

function App() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-[#f5f5f5] dark:bg-[#1a1a1a]">
			<div className={`mx-auto p-8 ${UI.MAX_LAYOUT_WIDTH}`}>
				<div className="mb-8 flex items-start justify-between">
					<div>
						<h1 className="text-4xl font-bold text-black dark:text-white font-mono">
							{t("app.title")}
						</h1>
						<p className="mt-2 text-black dark:text-white font-mono">{t("app.subtitle")}</p>
					</div>
					<div className="flex gap-2">
						<NotificationToggle />
						<LanguageToggle />
						<ThemeToggle />
					</div>
				</div>
				<PortTable />
			</div>
			<Toaster />
		</div>
	);
}

export default App;
