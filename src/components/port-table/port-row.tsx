import { useState } from "react";
import { Button, TableCell, TableRow } from "@/components/brutalist";
import { CATEGORY_INFO } from "@/constants/categories";
import type { PortInfo } from "@/types/port";
import { ConnectionStatusIndicator } from "./connection-status-indicator";

interface PortRowProps {
	port: PortInfo;
	onKillClick: (port: PortInfo) => void;
	onRowClick: (port: PortInfo) => void;
}

export function PortRow({ port, onKillClick, onRowClick }: PortRowProps) {
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

	return (
		<TableRow
			key={`${port.pid}-${port.port}`}
			className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
			onClick={() => onRowClick(port)}
		>
			<TableCell className="text-base font-mono font-medium pl-4">{port.port}</TableCell>
			<TableCell className="font-medium">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						{port.appIconPath && !iconError ? (
							<img
								src={`http://localhost:3033${port.appIconPath}`}
								alt={port.appName || port.processName}
								className="size-7 rounded"
								onError={() => setIconError(true)}
							/>
						) : (
							<div className="size-7 flex justify-center items-center">
								<CategoryIcon className="size-6" />
							</div>
						)}
						<span className="font-medium">
							{port.dockerContainer
								? `${port.dockerContainer.name} (Docker)`
								: port.appName || port.processName}
						</span>
					</div>
					{port.dockerContainer ? (
						<>
							<span className="text-xs text-gray-400 dark:text-gray-500">
								{port.dockerContainer.image}
							</span>
							<span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
								{port.dockerContainer.composeConfigFiles || "Manual (docker run)"}
							</span>
						</>
					) : port.cwd && port.cwd !== "/" ? (
						<span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-md block">
							{port.cwd}
						</span>
					) : null}
				</div>
			</TableCell>
			<TableCell className="font-mono">{port.pid}</TableCell>
			<TableCell>
				<ConnectionStatusIndicator
					status={port.connectionStatus}
					connectionCount={port.connectionCount}
					showConnectionCount={false}
				/>
			</TableCell>
			<TableCell className="font-mono text-sm">{cpuUsage}</TableCell>
			<TableCell className="font-mono text-sm">{memoryUsage}</TableCell>
			<TableCell>
				<Button
					variant={
						port.category === "system" || port.category === "development" ? "ghost" : "destructive"
					}
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						onKillClick(port);
					}}
				>
					Kill
				</Button>
			</TableCell>
		</TableRow>
	);
}
