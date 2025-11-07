import { useState } from "react";
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/brutalist";
import { DialogDescription } from "@/components/ui/dialog";
import { CATEGORY_INFO } from "@/constants/categories";
import type { PortInfo } from "@/types/port";

interface PortDetailDialogProps {
	open: boolean;
	onClose: () => void;
	port: PortInfo | null;
	onKillClick: (port: PortInfo) => void;
	lastUpdatedTime: string;
}

export function PortDetailDialog({
	open,
	onClose,
	port,
	onKillClick,
	lastUpdatedTime,
}: PortDetailDialogProps) {
	const [iconError, setIconError] = useState(false);

	if (!port) return null;

	const categoryInfo = CATEGORY_INFO[port.category];
	const CategoryIcon = categoryInfo.icon;

	const cpuUsage = port.cpuUsage && port.cpuUsage > 0 ? `${port.cpuUsage.toFixed(2)}%` : "-";

	const formatMemory = (bytes: number | undefined): string => {
		if (!bytes || bytes === 0) return "-";
		const mb = bytes / 1024 / 1024;
		return mb < 0.01 ? "< 0.01 MB" : `${mb.toFixed(2)} MB`;
	};

	const memoryUsage = formatMemory(port.memoryUsage);
	const memoryRSS = formatMemory(port.memoryRSS);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="font-mono flex items-center gap-3">
						{port.appIconPath && !iconError ? (
							<img
								src={`http://localhost:3033${port.appIconPath}`}
								alt={port.appName || port.processName}
								className="size-8 rounded"
								onError={() => setIconError(true)}
							/>
						) : (
							<div className="size-8 flex justify-center items-center">
								<CategoryIcon className="size-7" />
							</div>
						)}
						<span>
							{port.dockerContainer
								? `${port.dockerContainer.name} (Docker)`
								: port.appName || port.processName}
						</span>
					</DialogTitle>
					<DialogDescription className="sr-only">
						Detailed information for port {port.port}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Basic Info Section */}
					<div className="space-y-3">
						<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
							{"/// BASIC INFO"}
						</h3>
						<div className="grid grid-cols-2 gap-4 font-mono text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">Port</span>
								<p className="font-bold text-base">{port.port}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">PID</span>
								<p className="font-bold">{port.pid}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Protocol</span>
								<p className="font-bold">{port.protocol}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Address</span>
								<p className="font-bold break-all">{port.address}</p>
							</div>
							<div className="col-span-2">
								<span className="text-gray-600 dark:text-gray-400">Category</span>
								<p className="font-bold flex items-center gap-2 mt-1">
									<CategoryIcon className="size-5" />
									{categoryInfo.label}
								</p>
							</div>
						</div>
					</div>

					{/* Connection Status Section */}
					<div className="space-y-3">
						<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
							{"/// CONNECTION STATUS"}
						</h3>
						<div className="flex items-center gap-2">
							<Badge variant={port.connectionStatus === "active" ? "success" : "default"}>
								{port.connectionStatus === "active"
									? `Active (${port.connectionCount} connections)`
									: "Idle"}
							</Badge>
						</div>
					</div>

					{/* Resource Usage Section */}
					<div className="space-y-3">
						<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
							{"/// RESOURCE USAGE"}
						</h3>
						<div className="grid grid-cols-3 gap-4 font-mono text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">CPU Usage</span>
								<p className="font-bold">{cpuUsage}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Memory</span>
								<p className="font-bold">{memoryUsage}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">RSS</span>
								<p className="font-bold">{memoryRSS}</p>
							</div>
						</div>
					</div>

					{/* Docker Info Section */}
					{port.dockerContainer && (
						<div className="space-y-3">
							<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
								{"/// DOCKER INFO"}
							</h3>
							<div className="space-y-2 font-mono text-sm">
								<div>
									<span className="text-gray-600 dark:text-gray-400">Container Name:</span>
									<p className="font-bold">{port.dockerContainer.name}</p>
								</div>
								<div>
									<span className="text-gray-600 dark:text-gray-400">Image:</span>
									<p className="font-bold">{port.dockerContainer.image}</p>
								</div>
								<div>
									<span className="text-gray-600 dark:text-gray-400">Config:</span>
									<p className="font-bold">
										{port.dockerContainer.composeConfigFiles || "Manual (docker run)"}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Command Path Section */}
					{port.commandPath && (
						<div className="space-y-3">
							<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
								{"/// COMMAND PATH"}
							</h3>
							<p className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-3 rounded">
								{port.commandPath}
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="pt-4 border-t-2 border-black dark:border-white">
						<div className="flex items-center justify-between">
							{lastUpdatedTime ? (
								<p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
									Last updated: {lastUpdatedTime}
								</p>
							) : (
								<div />
							)}
							<div className="flex gap-2">
								<Button variant="outline" onClick={onClose}>
									Close
								</Button>
								<Button
									variant={
										port.category === "system" || port.category === "development"
											? "ghost"
											: "destructive"
									}
									onClick={() => {
										onKillClick(port);
										onClose();
									}}
								>
									Kill Process
								</Button>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
