import { useState } from "react";
import { Badge, Button, TableCell, TableRow } from "@/components/brutalist";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_INFO } from "@/constants/categories";
import type { PortInfo } from "@/types/port";

interface PortRowProps {
	port: PortInfo;
	onKillClick: (port: PortInfo) => void;
	onRowClick: (port: PortInfo) => void;
}

export function PortRow({ port, onKillClick, onRowClick }: PortRowProps) {
	const [iconError, setIconError] = useState(false);
	const categoryInfo = CATEGORY_INFO[port.category];
	const CategoryIcon = categoryInfo.icon;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
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
							) : port.commandPath?.startsWith("/") &&
								!port.commandPath.includes(".app/") &&
								(port.commandPath.includes(".") || port.commandPath.split("/").length > 5) ? (
								<span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md block">
									{port.commandPath}
								</span>
							) : null}
						</div>
					</TableCell>
					<TableCell className="font-mono">{port.pid}</TableCell>
					<TableCell>
						<Badge variant={port.connectionStatus === "active" ? "success" : "default"}>
							{port.connectionStatus === "active" ? `Active (${port.connectionCount})` : "Idle"}
						</Badge>
					</TableCell>
					<TableCell>
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
							Kill
						</Button>
					</TableCell>
				</TableRow>
			</TooltipTrigger>
			<TooltipContent side="bottom" align="start" hideArrow className="max-w-md">
				<div className="space-y-1 font-mono text-xs">
					<p>
						<span className="font-bold">Protocol:</span> {port.protocol}
					</p>
					<p>
						<span className="font-bold">Address:</span> {port.address}
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
