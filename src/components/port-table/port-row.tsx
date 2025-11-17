import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button, Checkbox, TableCell, TableRow } from "@/components/brutalist";
import { ASSETS_BASE_URL } from "@/config/api";
import { CATEGORY_INFO } from "@/constants/categories";
import { openInBrowser } from "@/lib/api";
import type { PortInfo } from "@/types/port";
import { ConnectionStatusIndicator } from "./connection-status-indicator";

interface PortRowProps {
	port: PortInfo;
	onKillClick: (port: PortInfo) => void;
	onRowClick: (port: PortInfo) => void;
	isSelected?: boolean;
	onToggleSelection?: (port: number) => void;
}

export function PortRow({
	port,
	onKillClick,
	onRowClick,
	isSelected = false,
	onToggleSelection,
}: PortRowProps) {
	const { t } = useTranslation();
	const [iconError, setIconError] = useState(false);
	const categoryInfo = CATEGORY_INFO[port.category];
	const CategoryIcon = categoryInfo.icon;

	const formatMemory = (bytes: number | undefined): string => {
		if (!bytes || bytes === 0) return "-";
		const mb = bytes / 1024 / 1024;
		return mb < 0.01 ? "~ 0 MB" : `${mb.toFixed(2)} MB`;
	};

	const cpuUsage = port.cpuUsage && port.cpuUsage > 0 ? `${port.cpuUsage.toFixed(2)}%` : "-";
	const memoryUsage = formatMemory(port.memoryUsage);

	const handleOpenInBrowser = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await openInBrowser(port.port);
		} catch (error) {
			console.error("Failed to open in browser:", error);
			toast.error(
				t("portRow.toast.failedToOpenBrowser", {
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);
		}
	};

	return (
		<TableRow
			key={`${port.pid}-${port.port}`}
			className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
			onClick={() => onRowClick(port)}
		>
			<TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
				<Checkbox checked={isSelected} onCheckedChange={() => onToggleSelection?.(port.port)} />
			</TableCell>
			<TableCell className="text-base font-mono font-medium">{port.port}</TableCell>
			<TableCell className="font-medium">
				<div className="flex flex-col gap-1 whitespace-break-spaces">
					<div className="flex items-center gap-2">
						{port.appIconPath && !iconError ? (
							<img
								src={`${ASSETS_BASE_URL}${port.appIconPath}`}
								alt={port.appName || port.processName}
								className="size-7 rounded"
								onError={() => setIconError(true)}
							/>
						) : (
							<div className="size-7 flex justify-center items-center">
								<CategoryIcon className="size-6" />
							</div>
						)}
						<div className="flex items-center gap-2">
							<span className="font-medium">
								{port.dockerContainer
									? `${port.dockerContainer.name} (Docker)`
									: port.appName || port.processName}
							</span>
							{port.isSelfPort && (
								<span className="px-2 py-0.5 text-xs font-bold bg-cyan-400 dark:bg-cyan-500 text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] whitespace-nowrap">
									PORTBOARD
								</span>
							)}
						</div>
					</div>
					{port.dockerContainer ? (
						<>
							<span className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
								{port.dockerContainer.image}
							</span>
							<span className="text-xs text-gray-500 dark:text-gray-400 font-mono line-clamp-1">
								{port.dockerContainer.composeConfigFiles || t("portRow.docker.manualRun")}
							</span>
						</>
					) : port.cwd && port.cwd !== "/" ? (
						<span className="text-xs text-gray-500 dark:text-gray-400 font-mono line-clamp-1">
							{port.cwd}
						</span>
					) : null}
				</div>
			</TableCell>
			<TableCell className="hidden lg:table-cell font-mono">{port.pid}</TableCell>
			<TableCell className="hidden lg:table-cell">
				<ConnectionStatusIndicator
					status={port.connectionStatus}
					connectionCount={port.connectionCount}
					showConnectionCount={false}
				/>
			</TableCell>
			<TableCell className="hidden lg:table-cell font-mono text-sm">{cpuUsage}</TableCell>
			<TableCell className="hidden lg:table-cell font-mono text-sm">{memoryUsage}</TableCell>
			<TableCell className="sm:pr-4">
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleOpenInBrowser}
						title={t("portRow.buttons.openInBrowser")}
						className="hidden sm:flex"
					>
						<ExternalLink className="size-4" />
					</Button>
					<Button
						variant={
							port.category === "system" || port.category === "development"
								? "ghost"
								: "destructive"
						}
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							onKillClick(port);
						}}
					>
						{t("portRow.buttons.kill")}
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
