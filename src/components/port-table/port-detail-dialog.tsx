import { Check, ChevronDown, Code, Copy, FolderOpen, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Badge,
	Button,
	CopyButton,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/brutalist";
import { DialogDescription } from "@/components/ui/dialog";
import { CATEGORY_INFO } from "@/constants/categories";
import {
	fetchAvailableIDEs,
	fetchAvailableTerminals,
	type IDEInfo,
	openContainerShell,
	openInIDE,
	openInTerminal,
	type TerminalInfo,
} from "@/lib/api";
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
	const [availableIDEs, setAvailableIDEs] = useState<IDEInfo[]>([]);
	const [availableTerminals, setAvailableTerminals] = useState<TerminalInfo[]>([]);

	// Fetch available IDEs and terminals on mount
	useEffect(() => {
		fetchAvailableIDEs()
			.then((ides) => {
				setAvailableIDEs(ides);
			})
			.catch((error) => {
				console.error("Failed to fetch available IDEs:", error);
			});

		fetchAvailableTerminals()
			.then((terminals) => {
				setAvailableTerminals(terminals);
			})
			.catch((error) => {
				console.error("Failed to fetch available terminals:", error);
			});
	}, []);

	if (!port) return null;

	const categoryInfo = CATEGORY_INFO[port.category];
	const CategoryIcon = categoryInfo.icon;

	// Extract compose directory from composeConfigFiles
	const getComposeDirectory = (): string | null => {
		if (!port.dockerContainer?.composeConfigFiles) return null;
		// composeConfigFiles is like "/path/to/project/compose.yaml"
		const lastSlashIndex = port.dockerContainer.composeConfigFiles.lastIndexOf("/");
		if (lastSlashIndex === -1) return null;
		return port.dockerContainer.composeConfigFiles.substring(0, lastSlashIndex);
	};

	const composeDirectory = getComposeDirectory();

	const formatMemory = (bytes: number | undefined): string => {
		if (!bytes || bytes === 0) return "-";
		const mb = bytes / 1024 / 1024;
		return mb < 0.01 ? "~ 0 MB" : `${mb.toFixed(2)} MB`;
	};

	const formatUptime = (startTime: Date): string => {
		const now = new Date();
		const diffMs = now.getTime() - startTime.getTime();
		const diffSeconds = Math.floor(diffMs / 1000);
		const diffMinutes = Math.floor(diffSeconds / 60);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffDays > 0) {
			const hours = diffHours % 24;
			return `${diffDays}d ${hours}h`;
		}
		if (diffHours > 0) {
			const minutes = diffMinutes % 60;
			return `${diffHours}h ${minutes}m`;
		}
		if (diffMinutes > 0) {
			const seconds = diffSeconds % 60;
			return `${diffMinutes}m ${seconds}s`;
		}
		return `${diffSeconds}s`;
	};

	const formatDateTime = (date: Date): string => {
		return date.toLocaleString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
	};

	const cpuUsage = port.cpuUsage && port.cpuUsage > 0 ? `${port.cpuUsage.toFixed(2)}%` : "-";
	const memoryUsage = formatMemory(port.memoryUsage);
	const memoryRSS = formatMemory(port.memoryRSS);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col pr-0!">
				<DialogHeader className="pr-6">
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

				<div className="space-y-6 overflow-y-auto flex-1 pb-4 pr-6">
					{/* Basic Info Section */}
					<div className="space-y-3">
						<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
							{"/// BASIC INFO"}
						</h3>
						<div className="grid grid-cols-2 gap-4 font-mono text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{port.dockerContainer ? "Port (Host:Container)" : "Port"}
								</span>
								<p className="font-bold text-base">
									{port.dockerContainer?.containerPort
										? `${port.port}:${port.dockerContainer.containerPort}`
										: port.port}
								</p>
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
							{port.processStartTime && (
								<>
									<div className="col-span-2">
										<span className="text-gray-600 dark:text-gray-400">Started</span>
										<p className="font-bold">{formatDateTime(new Date(port.processStartTime))}</p>
									</div>
									<div className="col-span-2">
										<span className="text-gray-600 dark:text-gray-400">Uptime</span>
										<p className="font-bold">{formatUptime(new Date(port.processStartTime))}</p>
									</div>
								</>
							)}
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

					{/* Working Directory Section - Docker Containers */}
					{port.dockerContainer && (
						<div className="space-y-3">
							<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
								{"/// ACTIONS"}
							</h3>
							<div className="space-y-2">
								{/* docker-compose project directory */}
								{composeDirectory && (
									<div>
										<span className="text-gray-600 dark:text-gray-400 text-xs block mb-1">
											Project Directory
										</span>
										<p className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2">
											{composeDirectory}
										</p>
										<div className="flex gap-2 flex-wrap">
											<CopyButton value={composeDirectory}>
												{({ copied, copy }) => (
													<Button
														variant="outline"
														size="sm"
														className="flex items-center gap-2"
														onClick={copy}
													>
														{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
														{copied ? "Copied!" : "Copy"}
													</Button>
												)}
											</CopyButton>

											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														className="flex items-center gap-2"
														disabled={availableIDEs.length === 0}
													>
														<FolderOpen className="size-4" />
														Open With...
														<ChevronDown className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="start">
													{availableIDEs.length > 0 && (
														<>
															<DropdownMenuLabel>IDEs</DropdownMenuLabel>
															{availableIDEs.map((ide) => (
																<DropdownMenuItem
																	key={ide.id}
																	onClick={async () => {
																		try {
																			await openInIDE(composeDirectory, ide.command);
																			toast.success(`Opening project in ${ide.name}...`);
																		} catch (error) {
																			toast.error(
																				error instanceof Error
																					? error.message
																					: "Failed to open in IDE",
																			);
																		}
																	}}
																	className="text-sm py-2"
																>
																	{ide.iconPath ? (
																		<img
																			src={`http://localhost:3033${ide.iconPath}`}
																			alt={ide.name}
																			className="size-5 mr-2 rounded"
																		/>
																	) : (
																		<Code className="size-5 mr-2" />
																	)}
																	{ide.name}
																</DropdownMenuItem>
															))}
															<DropdownMenuSeparator />
														</>
													)}
													{/* Container shell */}
													<DropdownMenuLabel>
														Terminals
														<div className="text-xs font-normal text-muted-foreground mt-0.5">
															Open container shell
														</div>
													</DropdownMenuLabel>
													{availableTerminals.map((terminal) => (
														<DropdownMenuItem
															key={terminal.id}
															onClick={async () => {
																if (!port.dockerContainer?.name) return;
																try {
																	await openContainerShell(
																		port.dockerContainer.name,
																		terminal.command,
																	);
																	toast.success(`Opening shell in ${terminal.name}...`);
																} catch (error) {
																	toast.error(
																		error instanceof Error
																			? error.message
																			: "Failed to open container shell",
																	);
																}
															}}
															className="text-sm py-2"
														>
															{terminal.iconPath ? (
																<img
																	src={`http://localhost:3033${terminal.iconPath}`}
																	alt={terminal.name}
																	className="size-5 mr-2 rounded"
																/>
															) : (
																<Terminal className="size-5 mr-2" />
															)}
															{terminal.name}
														</DropdownMenuItem>
													))}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Working Directory Section - Non-Docker Processes */}
					{!port.dockerContainer && port.cwd && port.cwd !== "/" && (
						<div className="space-y-3">
							<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
								{"/// WORKING DIRECTORY"}
							</h3>
							<div className="space-y-2">
								<p className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-3 rounded">
									{port.cwd}
								</p>
								<div className="flex gap-2 flex-wrap">
									<CopyButton value={port.cwd}>
										{({ copied, copy }) => (
											<Button
												variant="outline"
												size="sm"
												className="flex items-center gap-2"
												onClick={copy}
											>
												{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
												{copied ? "Copied!" : "Copy"}
											</Button>
										)}
									</CopyButton>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="flex items-center gap-2"
												disabled={availableIDEs.length === 0 && availableTerminals.length === 0}
											>
												<FolderOpen className="size-4" />
												Open With...
												<ChevronDown className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start">
											{availableIDEs.length > 0 && (
												<>
													<DropdownMenuLabel>IDEs</DropdownMenuLabel>
													{availableIDEs.map((ide) => (
														<DropdownMenuItem
															key={ide.id}
															onClick={async () => {
																if (!port.cwd) return;
																try {
																	await openInIDE(port.cwd, ide.command);
																	toast.success(`Opening in ${ide.name}...`);
																} catch (error) {
																	toast.error(
																		error instanceof Error
																			? error.message
																			: "Failed to open in IDE",
																	);
																}
															}}
															className="text-sm py-2"
														>
															{ide.iconPath ? (
																<img
																	src={`http://localhost:3033${ide.iconPath}`}
																	alt={ide.name}
																	className="size-5 mr-2 rounded"
																/>
															) : (
																<Code className="size-5 mr-2" />
															)}
															{ide.name}
														</DropdownMenuItem>
													))}
													<DropdownMenuSeparator />
												</>
											)}
											<DropdownMenuLabel>Terminals</DropdownMenuLabel>
											{availableTerminals.map((terminal) => (
												<DropdownMenuItem
													key={terminal.id}
													onClick={async () => {
														if (!port.cwd) return;
														try {
															await openInTerminal(port.cwd, terminal.command);
															toast.success(`Opening in ${terminal.name}...`);
														} catch (error) {
															toast.error(
																error instanceof Error
																	? error.message
																	: "Failed to open in terminal",
															);
														}
													}}
													className="text-sm py-2"
												>
													{terminal.iconPath ? (
														<img
															src={`http://localhost:3033${terminal.iconPath}`}
															alt={terminal.name}
															className="size-5 mr-2 rounded"
														/>
													) : (
														<Terminal className="size-5 mr-2" />
													)}
													{terminal.name}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
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
