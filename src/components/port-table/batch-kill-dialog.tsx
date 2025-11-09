import { useAtomValue } from "jotai";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
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
import { CATEGORY_INFO } from "@/constants/categories";
import { killProcess } from "@/lib/api";
import { selectedPortsAtom } from "@/store/port-store";
import type { PortInfo } from "@/types/port";

interface BatchKillDialogProps {
	open: boolean;
	onClose: () => void;
	ports: PortInfo[];
	onKillSuccess: () => void;
}

export function BatchKillDialog({ open, onClose, ports, onKillSuccess }: BatchKillDialogProps) {
	const [isKilling, setIsKilling] = useState(false);
	const selectedPorts = useAtomValue(selectedPortsAtom);

	// Filter ports to only include selected ones
	const selectedPortInfos = ports.filter((p) => selectedPorts.has(p.port));

	// Check if any selected ports are system or development processes
	const hasSystemPorts = selectedPortInfos.some((p) => p.category === "system");
	const hasDevelopmentPorts = selectedPortInfos.some((p) => p.category === "development");
	const hasActivePorts = selectedPortInfos.some((p) => p.connectionStatus === "Active");

	const handleKill = async () => {
		setIsKilling(true);

		try {
			const results = await Promise.allSettled(
				selectedPortInfos.map(async (port) => {
					try {
						await killProcess(port.pid);
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
				toast.success("Batch Kill Successful", {
					description: `${successes} ${successes === 1 ? "process" : "processes"} killed successfully${failures > 0 ? `, ${failures} failed` : ""}`,
				});
				onKillSuccess();
				onClose();
			} else {
				toast.error("Batch Kill Failed", {
					description: "Failed to kill any processes",
				});
			}
		} catch (error) {
			toast.error("Batch Kill Failed", {
				description: error instanceof Error ? error.message : "Unknown error occurred",
			});
		} finally {
			setIsKilling(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Kill {selectedPortInfos.length} Selected Processes?</DialogTitle>
					<DialogDescription>
						This action will terminate the following processes. This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				{/* Warning badges */}
				{(hasSystemPorts || hasDevelopmentPorts || hasActivePorts) && (
					<div className="flex flex-col gap-2">
						{hasSystemPorts && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-red-500 bg-red-50 dark:bg-red-900/20">
								<AlertTriangle className="h-4 w-4 text-red-500" />
								<span className="text-sm font-medium text-red-700 dark:text-red-400">
									Warning: Includes system processes
								</span>
							</div>
						)}
						{hasDevelopmentPorts && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
								<AlertTriangle className="h-4 w-4 text-yellow-500" />
								<span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
									Warning: Includes development processes
								</span>
							</div>
						)}
						{hasActivePorts && (
							<div className="flex items-center gap-2 p-2 rounded border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20">
								<AlertTriangle className="h-4 w-4 text-orange-500" />
								<span className="text-sm font-medium text-orange-700 dark:text-orange-400">
									Warning: Some ports have active connections
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
										</div>
										<div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
											<span className="font-mono">PID: {port.pid}</span>
											<span>Category: {categoryInfo.label}</span>
											{port.connectionStatus === "Active" && (
												<span className="text-orange-600 dark:text-orange-400 font-medium">
													Active ({port.connectionCount} connections)
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
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleKill} disabled={isKilling}>
						{isKilling ? "Killing..." : `Kill ${selectedPortInfos.length} Processes`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
