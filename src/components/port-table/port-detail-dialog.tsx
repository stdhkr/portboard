import {
	Check,
	ChevronDown,
	Code,
	Copy,
	ExternalLink,
	FolderOpen,
	Pause,
	Play,
	RefreshCw,
	Terminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	BrutalistCollapsible,
	Button,
	CopyButton,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/brutalist";
import { ASSETS_BASE_URL } from "@/config/api";
import { DOCKER, TIMING, UI } from "@/config/constants";
import { CATEGORY_I18N_KEYS, CATEGORY_INFO } from "@/constants/categories";
import {
	type DockerLogsResponse,
	fetchAvailableIDEs,
	fetchAvailableTerminals,
	fetchDockerLogs,
	fetchNetworkURL,
	type IDEInfo,
	openContainerShell,
	openInBrowser,
	openInIDE,
	openInTerminal,
	type TerminalInfo,
} from "@/lib/api";
import type { PortInfo } from "@/types/port";
import { ConnectionStatusIndicator } from "./connection-status-indicator";

interface PortDetailDialogProps {
	open: boolean;
	onClose: () => void;
	port: PortInfo | null;
	onKillClick: (port: PortInfo) => void;
	lastUpdatedTime: string;
}

// Network URL Display Component
function NetworkURLDisplay({ port }: { port: number }) {
	const { t } = useTranslation();
	const [networkURL, setNetworkURL] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Fetch network URL on mount
	useEffect(() => {
		setLoading(true);
		fetchNetworkURL(port)
			.then((url) => {
				setNetworkURL(url);
			})
			.catch((error) => {
				console.error("Failed to fetch network URL:", error);
				toast.error(
					t("dialog.detail.toast.failedToFetchNetworkUrl", {
						error: error instanceof Error ? error.message : "Unknown error",
					}),
				);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [port, t]);

	return (
		<div>
			<span className="text-gray-600 dark:text-gray-400 text-sm font-mono">
				{t("dialog.detail.fields.networkUrl")}
			</span>
			{loading ? (
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
					{t("dialog.detail.values.loading")}
				</p>
			) : networkURL ? (
				<div className="flex items-center gap-2 mt-1">
					<p className="text-sm break-all flex-1 font-mono font-bold">{networkURL}</p>
					<CopyButton value={networkURL}>
						{({ copied, copy }) => (
							<Button
								variant="outline"
								size="sm"
								className="flex items-center gap-2 shrink-0"
								onClick={copy}
							>
								{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
								{copied ? t("dialog.detail.buttons.copied") : t("dialog.detail.buttons.copy")}
							</Button>
						)}
					</CopyButton>
				</div>
			) : (
				<p className="text-xs text-red-500 mt-1 font-mono">
					{t("dialog.detail.values.unavailable")}
				</p>
			)}
		</div>
	);
}

export function PortDetailDialog({
	open,
	onClose,
	port,
	onKillClick,
	lastUpdatedTime,
}: PortDetailDialogProps) {
	const { t } = useTranslation();
	const [iconError, setIconError] = useState(false);
	const [availableIDEs, setAvailableIDEs] = useState<IDEInfo[]>([]);
	const [availableTerminals, setAvailableTerminals] = useState<TerminalInfo[]>([]);
	const [dockerLogs, setDockerLogs] = useState<DockerLogsResponse | null>(null);
	const [logsLoading, setLogsLoading] = useState(false);
	const [logsError, setLogsError] = useState<string | null>(null);
	const [logsCollapsibleOpen, setLogsCollapsibleOpen] = useState(false);
	const [logLines, setLogLines] = useState(20); // Configurable line count
	const [followMode, setFollowMode] = useState(false); // Follow mode toggle
	const [lastFetchTime, setLastFetchTime] = useState<string | null>(null); // Last fetch timestamp for --since
	const intervalIdRef = useRef<number | null>(null); // Ref to hold interval ID

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
	}, []); // Empty dependency array - fetch only once on mount

	// Fetch logs function (plain function, no useCallback)
	const fetchLogs = (isFollowMode = false) => {
		if (!port?.dockerContainer?.id) return;
		setLogsLoading(true);
		setLogsError(null);

		// Use --since for follow mode to get only new logs
		const sinceParam = isFollowMode && lastFetchTime ? lastFetchTime : undefined;

		fetchDockerLogs(port.dockerContainer.id, logLines, sinceParam)
			.then((newLogs) => {
				if (isFollowMode && dockerLogs && newLogs.logs.length > 0) {
					// Append new logs to existing logs in follow mode
					setDockerLogs({
						...newLogs,
						logs: [...dockerLogs.logs, ...newLogs.logs],
						count: dockerLogs.logs.length + newLogs.logs.length,
					});
				} else {
					// Replace logs for initial fetch or manual refresh
					setDockerLogs(newLogs);
				}

				// Update last fetch time to current timestamp
				setLastFetchTime(new Date().toISOString());
			})
			.catch((error) => {
				setLogsError(error instanceof Error ? error.message : "Failed to fetch logs");
			})
			.finally(() => {
				setLogsLoading(false);
			});
	};

	// Start follow mode interval
	const startFollowMode = () => {
		if (intervalIdRef.current) return; // Already running
		if (!port?.dockerContainer?.id) return;

		intervalIdRef.current = window.setInterval(() => {
			fetchLogs(true); // Pass true to indicate follow mode
		}, TIMING.DOCKER_LOGS_REFRESH);
	};

	// Stop follow mode interval
	const stopFollowMode = () => {
		if (intervalIdRef.current) {
			clearInterval(intervalIdRef.current);
			intervalIdRef.current = null;
		}
	};

	// Handle follow mode toggle
	const handleFollowModeToggle = () => {
		const newFollowMode = !followMode;
		setFollowMode(newFollowMode);

		if (newFollowMode && logsCollapsibleOpen && port?.dockerContainer?.id) {
			startFollowMode();
		} else {
			stopFollowMode();
			setLastFetchTime(null); // Reset when turning off follow mode
		}
	};

	// Auto-fetch logs when collapsible is opened
	const handleLogsCollapsibleOpenChange = (isOpen: boolean) => {
		setLogsCollapsibleOpen(isOpen);
		if (isOpen && !dockerLogs && !logsLoading && !logsError) {
			fetchLogs(false);
		}
		// Stop follow mode when closing
		if (!isOpen) {
			stopFollowMode();
			setFollowMode(false);
			setLastFetchTime(null);
		} else if (isOpen && followMode && port?.dockerContainer?.id) {
			// Resume follow mode if it was enabled
			startFollowMode();
		}
	};

	// Handle line count change
	const handleLogLinesChange = (value: string) => {
		const newLines = Number(value);
		setLogLines(newLines);
		setLastFetchTime(null); // Reset for fresh fetch
		if (logsCollapsibleOpen && dockerLogs) {
			fetchLogs(false); // Full refresh when line count changes
		}
	};

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
		return date.toLocaleString(UI.LOCALE, {
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
			<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle className="font-mono flex items-center gap-3">
						{port.appIconPath && !iconError ? (
							<img
								src={`${ASSETS_BASE_URL}${port.appIconPath}`}
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
						{t("dialog.detail.description", { port: port.port })}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 overflow-y-auto flex-1 -mr-6 pr-6 dialog-scrollbar">
					{/* Basic Info Section */}
					<div className="space-y-3">
						<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
							{t("dialog.detail.sections.basicInfo")}
						</h3>
						<div className="grid grid-cols-2 gap-4 font-mono text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{port.dockerContainer
										? t("dialog.detail.fields.portHostContainer")
										: t("dialog.detail.fields.port")}
								</span>
								<p className="font-bold text-base">
									{port.dockerContainer?.containerPort
										? `${port.port}:${port.dockerContainer.containerPort}`
										: port.port}
								</p>
							</div>
							<div className="col-span-2">
								<Button
									variant="default"
									size="sm"
									onClick={async () => {
										try {
											await openInBrowser(port.port);
										} catch (error) {
											console.error("Failed to open in browser:", error);
											toast.error(
												t("dialog.detail.toast.failedToOpenBrowser", {
													error: error instanceof Error ? error.message : "Unknown error",
												}),
											);
										}
									}}
								>
									<ExternalLink className="size-4 mr-2" />
									{t("dialog.detail.buttons.openInBrowser")}
								</Button>
							</div>
							<div className="col-span-2">
								<NetworkURLDisplay port={port.port} />
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("dialog.detail.fields.pid")}
								</span>
								<p className="font-bold">{port.pid}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("dialog.detail.fields.protocol")}
								</span>
								<p className="font-bold">{port.protocol}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("dialog.detail.fields.address")}
								</span>
								<p className="font-bold break-all">{port.address}</p>
							</div>
							<div className="col-span-2">
								<span className="text-gray-600 dark:text-gray-400">
									{t("dialog.detail.fields.category")}
								</span>
								<p className="font-bold flex items-center gap-2 mt-1">
									<CategoryIcon className="size-5" />
									{t(CATEGORY_I18N_KEYS[port.category])}
								</p>
							</div>
							{port.processStartTime && (
								<>
									<div className="col-span-2">
										<span className="text-gray-600 dark:text-gray-400">
											{t("dialog.detail.fields.started")}
										</span>
										<p className="font-bold">{formatDateTime(new Date(port.processStartTime))}</p>
									</div>
									<div className="col-span-2">
										<span className="text-gray-600 dark:text-gray-400">
											{t("dialog.detail.fields.uptime")}
										</span>
										<p className="font-bold">{formatUptime(new Date(port.processStartTime))}</p>
									</div>
								</>
							)}
						</div>
					</div>

					{/* Connection Status Section */}
					<div className="space-y-3">
						<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
							{t("dialog.detail.sections.connectionStatus")}
						</h3>
						<ConnectionStatusIndicator
							status={port.connectionStatus}
							connectionCount={port.connectionCount}
							showConnectionCount={true}
						/>
					</div>

					{/* Resource Usage Section */}
					<div className="space-y-3">
						<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
							{t("dialog.detail.sections.resourceUsage")}
						</h3>
						<div className="grid grid-cols-3 gap-4 font-mono text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("dialog.detail.fields.cpuUsage")}
								</span>
								<p className="font-bold">{cpuUsage}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("dialog.detail.fields.memory")}
								</span>
								<p className="font-bold">{memoryUsage}</p>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">
									{t("dialog.detail.fields.rss")}
								</span>
								<p className="font-bold">{memoryRSS}</p>
							</div>
						</div>
					</div>

					{/* Docker Info Section */}
					{port.dockerContainer && (
						<div className="space-y-3">
							<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
								{t("dialog.detail.sections.dockerInfo")}
							</h3>
							<div className="space-y-2 font-mono text-sm">
								<div>
									<span className="text-gray-600 dark:text-gray-400">
										{t("dialog.detail.fields.containerName")}:
									</span>
									<p className="font-bold">{port.dockerContainer.name}</p>
								</div>
								<div>
									<span className="text-gray-600 dark:text-gray-400">
										{t("dialog.detail.fields.image")}:
									</span>
									<p className="font-bold">{port.dockerContainer.image}</p>
								</div>
								<div>
									<span className="text-gray-600 dark:text-gray-400">
										{t("dialog.detail.fields.config")}:
									</span>
									<p className="font-bold">
										{port.dockerContainer.composeConfigFiles ||
											t("dialog.detail.values.manualDockerRun")}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Docker Logs Section */}
					{port.dockerContainer && (
						<div className="space-y-3">
							<BrutalistCollapsible
								title={t("dialog.detail.sections.dockerLogs", { count: logLines })}
								open={logsCollapsibleOpen}
								onOpenChange={handleLogsCollapsibleOpenChange}
								className="mt-0"
							>
								<div className="font-mono text-xs">
									{/* Log Controls */}
									<div className="flex items-center gap-2 pb-4 pt-2 border-b-2 border-black dark:border-white mb-4">
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold">{t("dialog.detail.labels.lines")}:</span>
											<Select value={String(logLines)} onValueChange={handleLogLinesChange}>
												<SelectTrigger className="w-20 h-7 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{DOCKER.LOG_LINE_OPTIONS.map((option) => (
														<SelectItem key={option} value={String(option)}>
															{option}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<Button
											variant={followMode ? "default" : "outline"}
											onClick={handleFollowModeToggle}
											className="h-7 px-3 text-xs"
										>
											{followMode ? (
												<>
													<Pause className="h-3 w-3 mr-1" />
													{t("dialog.detail.buttons.stopFollow")}
												</>
											) : (
												<>
													<Play className="h-3 w-3 mr-1" />
													{t("dialog.detail.buttons.follow")}
												</>
											)}
										</Button>

										<Button
											variant="outline"
											onClick={() => fetchLogs(false)}
											disabled={logsLoading}
											className="h-7 px-3 text-xs"
										>
											<RefreshCw className={`h-3 w-3 mr-1 ${logsLoading ? "animate-spin" : ""}`} />
											{t("dialog.detail.buttons.refresh")}
										</Button>
									</div>

									{logsLoading && (
										<div className="text-center py-4 text-gray-500 dark:text-gray-400">
											{t("dialog.detail.logs.loading")}
										</div>
									)}

									{logsError && (
										<div className="text-center py-4 text-red-500">
											{t("dialog.detail.logs.error", { error: logsError })}
										</div>
									)}

									{dockerLogs && dockerLogs.logs.length === 0 && (
										<div className="text-center py-4 text-gray-500 dark:text-gray-400">
											{t("dialog.detail.logs.noLogs")}
										</div>
									)}

									{dockerLogs && dockerLogs.logs.length > 0 && (
										<div className="space-y-2 max-h-96 overflow-y-auto text-gray-900 dark:text-green-400 px-4 pb-4 -mx-4 dialog-scrollbar">
											{dockerLogs.logs.map((log, index) => (
												<div
													key={`${log.timestamp}-${index}`}
													className={`${
														log.level === "error"
															? "text-red-600 dark:text-red-400"
															: log.level === "warn"
																? "text-yellow-600 dark:text-yellow-400"
																: "text-gray-900 dark:text-green-400"
													}`}
												>
													{log.timestamp && (
														<span className="text-gray-500 dark:text-gray-500 mr-2">
															{log.timestamp}
														</span>
													)}
													<span className="whitespace-pre-wrap break-all">{log.message}</span>
												</div>
											))}
										</div>
									)}
								</div>
							</BrutalistCollapsible>
						</div>
					)}

					{/* Working Directory Section - Docker Containers */}
					{port.dockerContainer && composeDirectory && (
						<div className="space-y-3">
							<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
								{t("dialog.detail.sections.projectDirectory")}
							</h3>
							<div className="space-y-2">
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
												{copied
													? t("dialog.detail.buttons.copied")
													: t("dialog.detail.buttons.copy")}
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
												{t("dialog.detail.buttons.openWith")}
												<ChevronDown className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start">
											{/* Finder Section */}
											{availableIDEs.some((ide) => ide.name === "Finder") && (
												<>
													<DropdownMenuLabel>{t("dialog.detail.labels.finder")}</DropdownMenuLabel>
													<DropdownMenuItem
														onClick={async () => {
															try {
																await openInIDE(composeDirectory, "open");
															} catch (error) {
																toast.error(
																	error instanceof Error
																		? error.message
																		: t("dialog.detail.toast.failedToOpenIDE"),
																);
															}
														}}
														className="text-sm py-2"
													>
														<FolderOpen className="size-5 mr-2" />
														Finder
													</DropdownMenuItem>
													<DropdownMenuSeparator />
												</>
											)}

											{/* IDEs Section */}
											{availableIDEs.filter((ide) => ide.name !== "Finder").length > 0 && (
												<>
													<DropdownMenuLabel>{t("dialog.detail.labels.ides")}</DropdownMenuLabel>
													{availableIDEs
														.filter((ide) => ide.name !== "Finder")
														.map((ide, index) => (
															<DropdownMenuItem
																key={`compose-ide-${ide.id}-${index}`}
																onClick={async () => {
																	try {
																		await openInIDE(composeDirectory, ide.command);
																		toast.success(
																			t("dialog.detail.toast.openingInIDE", { name: ide.name }),
																		);
																	} catch (error) {
																		toast.error(
																			error instanceof Error
																				? error.message
																				: t("dialog.detail.toast.failedToOpenIDE"),
																		);
																	}
																}}
																className="text-sm py-2"
															>
																{ide.iconPath ? (
																	<img
																		src={`${ASSETS_BASE_URL}${ide.iconPath}`}
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
												{t("dialog.detail.labels.terminals")}
												<div className="text-xs font-normal text-muted-foreground mt-0.5">
													{t("dialog.detail.labels.openContainerShell")}
												</div>
											</DropdownMenuLabel>
											{availableTerminals.map((terminal, index) => (
												<DropdownMenuItem
													key={`compose-terminal-${terminal.id}-${index}`}
													onClick={async () => {
														if (!port.dockerContainer?.name) return;
														try {
															await openContainerShell(port.dockerContainer.name, terminal.command);
															toast.success(
																t("dialog.detail.toast.openingShell", { name: terminal.name }),
															);
														} catch (error) {
															toast.error(
																error instanceof Error
																	? error.message
																	: t("dialog.detail.toast.failedToOpenShell"),
															);
														}
													}}
													className="text-sm py-2"
												>
													{terminal.iconPath ? (
														<img
															src={`${ASSETS_BASE_URL}${terminal.iconPath}`}
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

					{/* Working Directory Section - Non-Docker Processes */}
					{!port.dockerContainer && port.cwd && port.cwd !== "/" && (
						<div className="space-y-3">
							<h3 className="font-bold font-mono text-sm border-b-2 border-black dark:border-white pb-1">
								{t("dialog.detail.sections.workingDirectory")}
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
												className="flex items-center gap-2 font-mono"
												onClick={copy}
											>
												{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
												{copied
													? t("dialog.detail.buttons.copied")
													: t("dialog.detail.buttons.copy")}
											</Button>
										)}
									</CopyButton>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												className="flex items-center gap-2 font-mono"
												disabled={availableIDEs.length === 0 && availableTerminals.length === 0}
											>
												<FolderOpen className="size-4" />
												{t("dialog.detail.buttons.openWith")}
												<ChevronDown className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start">
											{/* Finder Section */}
											{availableIDEs.some((ide) => ide.name === "Finder") && (
												<>
													<DropdownMenuLabel>{t("dialog.detail.labels.finder")}</DropdownMenuLabel>
													<DropdownMenuItem
														onClick={async () => {
															if (!port.cwd) return;
															try {
																await openInIDE(port.cwd, "open");
															} catch (error) {
																toast.error(
																	error instanceof Error
																		? error.message
																		: t("dialog.detail.toast.failedToOpenIDE"),
																);
															}
														}}
														className="text-sm py-2"
													>
														<FolderOpen className="size-5 mr-2" />
														Finder
													</DropdownMenuItem>
													<DropdownMenuSeparator />
												</>
											)}

											{/* IDEs Section */}
											{availableIDEs.filter((ide) => ide.name !== "Finder").length > 0 && (
												<>
													<DropdownMenuLabel>{t("dialog.detail.labels.ides")}</DropdownMenuLabel>
													{availableIDEs
														.filter((ide) => ide.name !== "Finder")
														.map((ide, index) => (
															<DropdownMenuItem
																key={`ide-${ide.id}-${index}`}
																onClick={async () => {
																	if (!port.cwd) return;
																	try {
																		await openInIDE(port.cwd, ide.command);
																		toast.success(
																			t("dialog.detail.toast.openingIn", { name: ide.name }),
																		);
																	} catch (error) {
																		toast.error(
																			error instanceof Error
																				? error.message
																				: t("dialog.detail.toast.failedToOpenIDE"),
																		);
																	}
																}}
																className="text-sm py-2"
															>
																{ide.iconPath ? (
																	<img
																		src={`${ASSETS_BASE_URL}${ide.iconPath}`}
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

											{/* Terminals Section */}
											<DropdownMenuLabel>{t("dialog.detail.labels.terminals")}</DropdownMenuLabel>
											{availableTerminals.map((terminal, index) => (
												<DropdownMenuItem
													key={`terminal-${terminal.id}-${index}`}
													onClick={async () => {
														if (!port.cwd) return;
														try {
															await openInTerminal(port.cwd, terminal.command);
															toast.success(
																t("dialog.detail.toast.openingIn", { name: terminal.name }),
															);
														} catch (error) {
															toast.error(
																error instanceof Error
																	? error.message
																	: t("dialog.detail.toast.failedToOpenTerminal"),
															);
														}
													}}
													className="text-sm py-2"
												>
													{terminal.iconPath ? (
														<img
															src={`${ASSETS_BASE_URL}${terminal.iconPath}`}
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
								{t("dialog.detail.sections.commandPath")}
							</h3>
							<p className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-3 rounded">
								{port.commandPath}
							</p>
						</div>
					)}
				</div>

				{/* Footer Actions - Fixed at bottom */}
				<div className="pt-4 border-t-2 border-black dark:border-white shrink-0">
					<div className="flex items-center justify-between">
						{lastUpdatedTime ? (
							<p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
								{t("dialog.detail.footer.lastUpdated", { time: lastUpdatedTime })}
							</p>
						) : (
							<div />
						)}
						<div className="flex gap-2">
							<Button variant="outline" onClick={onClose}>
								{t("dialog.detail.buttons.close")}
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
								{t("dialog.detail.buttons.killProcess")}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
