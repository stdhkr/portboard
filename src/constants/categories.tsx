import { AppWindow, Database, Globe, List, Package, Settings, Wrench } from "lucide-react";
import type { ProcessCategory } from "@/types/port";

// Translation key mapping for categories
export const CATEGORY_I18N_KEYS: Record<ProcessCategory | "all", string> = {
	all: "search.filters.all",
	system: "search.filters.system",
	development: "search.filters.development",
	database: "search.filters.database",
	"web-server": "search.filters.webServer",
	applications: "search.filters.applications",
	user: "search.filters.user",
};

// Category metadata
export const CATEGORY_INFO: Record<
	ProcessCategory | "all",
	{ icon: React.ComponentType<{ className?: string }>; color: string }
> = {
	all: { icon: List, color: "bg-gray-100 dark:bg-gray-800" },
	system: { icon: Settings, color: "bg-gray-100 dark:bg-gray-800" },
	development: { icon: Wrench, color: "bg-blue-100 dark:bg-blue-900" },
	database: { icon: Database, color: "bg-purple-100 dark:bg-purple-900" },
	"web-server": { icon: Globe, color: "bg-green-100 dark:bg-green-900" },
	applications: {
		icon: AppWindow,
		color: "bg-cyan-100 dark:bg-cyan-900",
	},
	user: { icon: Package, color: "bg-orange-100 dark:bg-orange-900" },
};
