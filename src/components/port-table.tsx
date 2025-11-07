import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Database, Globe, List, Package, RefreshCw, Settings, Wrench, X } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/brutalist";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { fetchPorts, killProcess } from "@/lib/api";
import {
	categoryFilterAtom,
	closeKillDialogAtom,
	isKillDialogOpenAtom,
	openKillDialogAtom,
	selectedPortAtom,
} from "@/store/port-store";
import type { PortInfo, ProcessCategory } from "@/types/port";

const REFRESH_INTERVAL = 5000; // 5 seconds

// Category metadata
const CATEGORY_INFO: Record<
	ProcessCategory | "all",
	{ label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
	all: { label: "All", icon: List, color: "bg-gray-100 dark:bg-gray-800" },
	system: { label: "System", icon: Settings, color: "bg-gray-100 dark:bg-gray-800" },
	development: { label: "Dev Tools", icon: Wrench, color: "bg-blue-100 dark:bg-blue-900" },
	database: { label: "Database", icon: Database, color: "bg-purple-100 dark:bg-purple-900" },
	"web-server": { label: "Web Server", icon: Globe, color: "bg-green-100 dark:bg-green-900" },
	user: { label: "User Apps", icon: Package, color: "bg-orange-100 dark:bg-orange-900" },
};

export function PortTable() {
	const {
		data: ports,
		error,
		isLoading,
		mutate,
	} = useSWR<PortInfo[]>("ports", fetchPorts, {
		refreshInterval: REFRESH_INTERVAL,
		revalidateOnFocus: true,
	});

	const selectedPort = useAtomValue(selectedPortAtom);
	const isKillDialogOpen = useAtomValue(isKillDialogOpenAtom);
	const openKillDialog = useSetAtom(openKillDialogAtom);
	const closeKillDialog = useSetAtom(closeKillDialogAtom);

	const [categoryFilter, setCategoryFilter] = useAtom(categoryFilterAtom);
	const [isKilling, setIsKilling] = useState(false);

	// Filter ports by category
	const filteredPorts = useMemo(() => {
		if (!ports) return [];
		if (categoryFilter === "all") return ports;
		return ports.filter((port) => port.category === categoryFilter);
	}, [ports, categoryFilter]);

	const handleKillClick = (port: PortInfo) => {
		openKillDialog(port);
	};

	const handleKillConfirm = async () => {
		if (!selectedPort) return;

		setIsKilling(true);
		try {
			await killProcess(selectedPort.pid);
			toast({
				title: "Process killed",
				description: `Successfully killed process ${selectedPort.processName} (PID: ${selectedPort.pid})`,
			});
			closeKillDialog();
			// Refresh the list immediately
			mutate();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Failed to kill process",
				description: error instanceof Error ? error.message : "Unknown error occurred",
			});
		} finally {
			setIsKilling(false);
		}
	};

	const handleRefresh = () => {
		mutate();
		toast({
			title: "Refreshing",
			description: "Port list has been refreshed",
		});
	};

	if (error) {
		return (
			<div className="brutalist-border rounded-lg brutalist-red p-4">
				<h3 className="text-sm font-bold font-mono text-white">[!] ERROR LOADING PORTS</h3>
				<p className="mt-1 text-sm font-mono text-white">
					{error instanceof Error ? error.message : "Unknown error occurred"}
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-black dark:text-white font-mono">
							{"/// LISTENING PORTS"}
						</h2>
						<p className="text-sm text-black dark:text-white font-mono">
							{isLoading
								? "[LOADING...]"
								: `[${filteredPorts.length}/${ports?.length || 0} PORTS] [AUTO-REFRESH: 5S]`}
						</p>
					</div>
					<Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
						<RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>

				{/* Category filter buttons */}
				<div className="flex flex-wrap gap-2">
					{(["all", "development", "database", "web-server", "system", "user"] as const).map(
						(category) => {
							const info = CATEGORY_INFO[category];
							const isActive = categoryFilter === category;
							const Icon = info.icon;
							return (
								<Button
									key={category}
									variant={isActive ? "default" : "outline"}
									size="sm"
									onClick={() => setCategoryFilter(category)}
									className="gap-1"
								>
									<Icon className="h-4 w-4" />
									<span>{info.label}</span>
								</Button>
							);
						},
					)}
				</div>

				<div className="rounded-lg border-2 border-black dark:border-white overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[100px]">Port</TableHead>
								<TableHead>Process Name</TableHead>
								<TableHead className="w-[100px]">PID</TableHead>
								<TableHead className="w-[100px]">Protocol</TableHead>
								<TableHead>Address</TableHead>
								<TableHead className="w-[100px]">State</TableHead>
								<TableHead className="w-[100px] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										<div className="flex items-center justify-center">
											<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
											Loading ports...
										</div>
									</TableCell>
								</TableRow>
							) : filteredPorts.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										{ports?.length === 0
											? "No listening ports found"
											: `No ${CATEGORY_INFO[categoryFilter].label.toLowerCase()} found`}
									</TableCell>
								</TableRow>
							) : (
								filteredPorts.map((port) => {
									const categoryInfo = CATEGORY_INFO[port.category];
									const CategoryIcon = categoryInfo.icon;

									return (
										<TableRow key={`${port.pid}-${port.port}`}>
											<TableCell className="font-mono font-medium">{port.port}</TableCell>
											<TableCell className="font-medium">
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<CategoryIcon className="h-4 w-4" />
														<span className="font-medium">{port.appName || port.processName}</span>
													</div>
													{port.appName && port.processName !== port.appName && (
														<span className="text-xs text-gray-400 dark:text-gray-500">
															{port.processName}
														</span>
													)}
													{port.commandPath && (
														<Tooltip>
															<TooltipTrigger asChild>
																<span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md block">
																	{port.commandPath}
																</span>
															</TooltipTrigger>
															<TooltipContent side="bottom" align="start" className="max-w-lg">
																<p className="break-all">{port.commandPath}</p>
															</TooltipContent>
														</Tooltip>
													)}
												</div>
											</TableCell>
											<TableCell className="font-mono">{port.pid}</TableCell>
											<TableCell>{port.protocol}</TableCell>
											<TableCell className="font-mono">{port.address}</TableCell>
											<TableCell>
												<Badge variant="success">{port.state}</Badge>
											</TableCell>
											<TableCell className="text-right">
												<Button
													variant={
														port.category === "system" || port.category === "development"
															? "outline"
															: "destructive"
													}
													size="sm"
													onClick={() => handleKillClick(port)}
												>
													<X className="mr-1 h-3 w-3" />
													Kill
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Kill confirmation dialog */}
			<Dialog open={isKillDialogOpen} onOpenChange={closeKillDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Kill Process</DialogTitle>
						<DialogDescription>
							{selectedPort?.category === "development" ? (
								<span className="text-yellow-600 dark:text-yellow-400">
									⚠️ You are about to kill a development tool process. It is recommended to close the
									application itself instead of killing the process.
								</span>
							) : selectedPort?.category === "system" ? (
								<span className="text-red-600 dark:text-red-400">
									⚠️ Killing system processes is not recommended and may cause instability.
								</span>
							) : (
								"Are you sure you want to kill this process? This action cannot be undone."
							)}
						</DialogDescription>
					</DialogHeader>
					{selectedPort && (
						<div className="space-y-2 rounded-lg border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900 p-4">
							<div className="flex justify-between text-sm">
								<span className="font-bold font-mono text-black dark:text-white">PROCESS:</span>
								<span className="font-mono text-black dark:text-white flex items-center gap-2">
									{(() => {
										const SelectedIcon = CATEGORY_INFO[selectedPort.category].icon;
										return <SelectedIcon className="h-4 w-4" />;
									})()}
									<span>{selectedPort.appName || selectedPort.processName}</span>
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-bold font-mono text-black dark:text-white">CATEGORY:</span>
								<span className="font-mono text-black dark:text-white">
									{CATEGORY_INFO[selectedPort.category].label}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-bold font-mono text-black dark:text-white">PID:</span>
								<span className="font-mono text-black dark:text-white">{selectedPort.pid}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-bold font-mono text-black dark:text-white">PORT:</span>
								<span className="font-mono text-black dark:text-white">{selectedPort.port}</span>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={closeKillDialog}>
							Cancel
						</Button>
						<Button
							variant={
								selectedPort?.category === "system" || selectedPort?.category === "development"
									? "outline"
									: "destructive"
							}
							onClick={handleKillConfirm}
							disabled={isKilling}
						>
							{isKilling ? (
								<>
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
									Killing...
								</>
							) : (
								"Kill Process"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
