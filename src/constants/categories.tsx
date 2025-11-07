import { AppWindow, Database, Globe, List, Package, Settings, Wrench } from "lucide-react";
import type { ProcessCategory } from "@/types/port";

// Category metadata
export const CATEGORY_INFO: Record<
	ProcessCategory | "all",
	{ label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
	all: { label: "All", icon: List, color: "bg-gray-100 dark:bg-gray-800" },
	system: { label: "System", icon: Settings, color: "bg-gray-100 dark:bg-gray-800" },
	development: { label: "Dev Tools", icon: Wrench, color: "bg-blue-100 dark:bg-blue-900" },
	database: { label: "Database", icon: Database, color: "bg-purple-100 dark:bg-purple-900" },
	"web-server": { label: "Web Server", icon: Globe, color: "bg-green-100 dark:bg-green-900" },
	applications: {
		label: "Applications",
		icon: AppWindow,
		color: "bg-cyan-100 dark:bg-cyan-900",
	},
	user: { label: "User Apps", icon: Package, color: "bg-orange-100 dark:bg-orange-900" },
};
