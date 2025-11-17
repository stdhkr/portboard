import { useAtomValue } from "jotai";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/brutalist";
import { CATEGORY_I18N_KEYS, CATEGORY_INFO } from "@/constants/categories";
import { killProcess, stopDockerCompose, stopDockerContainer } from "@/lib/api";
import { selectedPortsAtom } from "@/store/port-store";
import type { PortInfo } from "@/types/port";

interface BatchKillDialogProps {
	open: boolean;
	onClose: () => void;
	ports: PortInfo[];
	onKillSuccess: () => void;
}

export function BatchKillDialog({ open, onClose, ports, onKillSuccess }: BatchKillDialogProps) {
	const { t } = useTranslation();
	const [isKilling, setIsKilling] = useState(false);
	const selectedPorts = useAtomValue(selectedPortsAtom);

	// Filter ports to only include selected ones
	const selectedPortInfos = ports.filter((p) => selectedPorts.has(p.port));

	// Check if any selected ports are system or development processes
	const hasSelfPort = selectedPortInfos.some((p) => p.isSelfPort);
	const hasSystemPorts = selectedPortInfos.some((p) => p.category === "system");
	const hasDevelopmentPorts = selectedPortInfos.some((p) => p.category === "development");
	const hasActivePorts = selectedPortInfos.some((p) => p.connectionStatus === "active");
	const hasDockerPorts = selectedPortInfos.some((p) => p.dockerContainer);

	const handleKill = async () => {
		setIsKilling(true);

		try {
			const results = await Promise.allSettled(
				selectedPortInfos.map(async (port) => {
					try {
						// Handle Docker containers
						if (port.dockerContainer) {
							// Try to stop compose project if available
							if (port.dockerContainer.composeConfigFiles) {
								const projectDir = port.dockerContainer.composeConfigFiles.substring(
									0,
									port.dockerContainer.composeConfigFiles.lastIndexOf("/"),
								);
								await stopDockerCompose(projectDir);
							} else {
								// Otherwise stop the container
								await stopDockerContainer(port.dockerContainer.name);
							}
						} else {
							// For non-Docker processes, kill normally
							await killProcess(port.pid);
						}
						return { port: port.port, success: true };
					} catch (error) {
						return {
							port: port.port,
							success: false,
							error: error instanceof Error ? error.message : "Unknown error",
						};
					}
				}),
			);

			// Count successes and failures
			const successes = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
			const failures = results.filter((r) => r.status === "fulfilled" && !r.value.success).length;

			if (successes > 0) {
				const dockerCount = selectedPortInfos.filter((p) => p.dockerContainer).length;
				const regularCount = selectedPortInfos.length - dockerCount;

				if (dockerCount > 0 && regularCount > 0) {
					toast.success(
						failures > 0
							? t("toast.batchKillPartial", {
									success: successes,
									total: selectedPortInfos.length,
									failed: failures,
								})
							: t("toast.batchKillWithDocker", {
									containers: dockerCount,
									processes: regularCount,
								}),
					);
				} else if (failures > 0) {
					toast.success(
						t("toast.batchKillPartial", {
							success: successes,
							total: selectedPortInfos.length,
							failed: failures,
						}),
					);
				} else {
					toast.success(t("toast.batchKillSuccess", { success: successes }));
				}
				onKillSuccess();
				onClose();
			} else {
				toast.error(t("toast.batchKillError"));
			}
		} catch (_error) {
			toast.error(t("toast.batchKillError"));
		} finally {
			setIsKilling(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{hasDockerPorts
							? t("dialog.batchKill.titleWithDocker", { count: selectedPortInfos.length })
							: t("dialog.batchKill.title", { count: selectedPortInfos.length })}
					</DialogTitle>
					<DialogDescription>
						{hasDockerPorts
							? t("dialog.batchKill.descriptionWithDocker")
							: t("dialog.batchKill.description")}
					</DialogDescription>
				</DialogHeader>

				{/* Warning badges */}
				{(hasSelfPort ||
					hasSystemPorts ||
					hasDevelopmentPorts ||
					hasActivePorts ||
					hasDockerPorts) && (
					<div className="flex flex-col gap-2">
						{hasSelfPort && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20">
								<AlertTriangle className="h-4 w-4 text-cyan-500" />
								<span className="text-sm font-bold text-cyan-700 dark:text-cyan-400">
									🛑 {t("dialog.batchKill.warnings.critical")}
								</span>
							</div>
						)}
						{hasDockerPorts && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
								<AlertTriangle className="h-4 w-4 text-blue-500" />
								<span className="text-sm font-medium text-blue-700 dark:text-blue-400">
									{t("dialog.batchKill.warnings.docker", {
										count: selectedPortInfos.filter((p) => p.dockerContainer).length,
									})}
								</span>
							</div>
						)}
						{hasSystemPorts && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-red-500 bg-red-50 dark:bg-red-900/20">
								<AlertTriangle className="h-4 w-4 text-red-500" />
								<span className="text-sm font-medium text-red-700 dark:text-red-400">
									{t("dialog.batchKill.warnings.system", {
										count: selectedPortInfos.filter((p) => p.category === "system").length,
									})}
								</span>
							</div>
						)}
						{hasDevelopmentPorts && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
								<AlertTriangle className="h-4 w-4 text-yellow-500" />
								<span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
									{t("dialog.batchKill.warnings.development", {
										count: selectedPortInfos.filter((p) => p.category === "development").length,
									})}
								</span>
							</div>
						)}
						{hasActivePorts && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20">
								<AlertTriangle className="h-4 w-4 text-orange-500" />
								<span className="text-sm font-medium text-orange-700 dark:text-orange-400">
									{t("dialog.batchKill.warnings.activeConnections", {
										count: selectedPortInfos.filter((p) => p.connectionStatus === "active").length,
									})}
								</span>
							</div>
						)}
					</div>
				)}

				{/* Selected ports list */}
				<div className="flex-1 overflow-y-auto pr-6">
					<div className="space-y-2">
						{selectedPortInfos.map((port) => {
							const categoryInfo = CATEGORY_INFO[port.category];
							const CategoryIcon = categoryInfo.icon;

							return (
								<div
									key={port.port}
									className="flex items-center gap-3 p-3 rounded-lg border-2 border-black dark:border-white bg-white dark:bg-black"
								>
									<div className="size-8 flex justify-center items-center">
										<CategoryIcon className="size-6" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-mono font-bold">Port {port.port}</span>
											<span className="font-medium truncate">
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
										<div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
											<span className="font-mono">PID: {port.pid}</span>
											<span>Category: {t(CATEGORY_I18N_KEYS[port.category])}</span>
											{port.connectionStatus === "active" && (
												<span className="text-orange-600 dark:text-orange-400 font-medium">
													{t("dialog.detail.values.active")} ({port.connectionCount} connections)
												</span>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isKilling}>
						{t("dialog.batchKill.cancel")}
					</Button>
					<Button variant="destructive" onClick={handleKill} disabled={isKilling}>
						{isKilling
							? `${hasDockerPorts ? t("dialog.batchKill.confirmWithDocker") : t("dialog.batchKill.confirm")}...`
							: hasDockerPorts
								? t("dialog.batchKill.confirmWithDocker")
								: t("dialog.batchKill.confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
