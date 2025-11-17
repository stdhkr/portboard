import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowDown, ArrowUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";
import {
	Button,
	Checkbox,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/brutalist";
import { BatchKillDialog } from "@/components/port-table/batch-kill-dialog";
import { KillDialog } from "@/components/port-table/kill-dialog";
import { PortDetailDialog } from "@/components/port-table/port-detail-dialog";
import { PortRow } from "@/components/port-table/port-row";
import { SearchBar } from "@/components/port-table/search-bar";
import { TIMING } from "@/config/constants";
import { CATEGORY_I18N_KEYS, CATEGORY_INFO } from "@/constants/categories";
import { usePortFiltering } from "@/hooks/use-port-filtering";
import { usePortSorting } from "@/hooks/use-port-sorting";
import { fetchPorts } from "@/lib/api";
import {
	categoryFilterAtom,
	closeBatchKillDialogAtom,
	closeKillDialogAtom,
	deselectAllPortsAtom,
	isBatchKillDialogOpenAtom,
	isKillDialogOpenAtom,
	openBatchKillDialogAtom,
	openKillDialogAtom,
	searchQueryAtom,
	selectAllPortsAtom,
	selectedPortAtom,
	selectedPortsAtom,
	togglePortSelectionAtom,
} from "@/store/port-store";
import type { PortInfo } from "@/types/port";

export function PortTable() {
	const { t } = useTranslation();
	const {
		data: ports,
		error,
		isLoading,
		mutate,
	} = useSWR<PortInfo[]>("ports", fetchPorts, {
		refreshInterval: TIMING.AUTO_REFRESH_INTERVAL,
		revalidateOnFocus: true,
	});

	const selectedPort = useAtomValue(selectedPortAtom);
	const isKillDialogOpen = useAtomValue(isKillDialogOpenAtom);
	const openKillDialog = useSetAtom(openKillDialogAtom);
	const closeKillDialog = useSetAtom(closeKillDialogAtom);

	const [categoryFilter, setCategoryFilter] = useAtom(categoryFilterAtom);
	const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);

	// Batch kill state
	const selectedPorts = useAtomValue(selectedPortsAtom);
	const togglePortSelection = useSetAtom(togglePortSelectionAtom);
	const selectAllPorts = useSetAtom(selectAllPortsAtom);
	const deselectAllPorts = useSetAtom(deselectAllPortsAtom);
	const isBatchKillDialogOpen = useAtomValue(isBatchKillDialogOpenAtom);
	const openBatchKillDialog = useSetAtom(openBatchKillDialogAtom);
	const closeBatchKillDialog = useSetAtom(closeBatchKillDialogAtom);

	// State for detail dialog
	const [detailDialogPort, setDetailDialogPort] = useState<PortInfo | null>(null);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

	// State for last updated timestamp
	const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");

	// Ref to store scroll container and position
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const scrollPositionRef = useRef<number>(0);

	// Save scroll position on scroll
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const handleScroll = () => {
			scrollPositionRef.current = container.scrollTop;
		};

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, []);

	// Restore scroll position after data update - use useLayoutEffect for synchronous restoration
	useLayoutEffect(() => {
		if (!ports) return;

		// Update timestamp
		const now = new Date();
		const timeString = now.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
		setLastUpdatedTime(timeString);

		// Restore scroll position immediately after DOM update
		const container = scrollContainerRef.current;
		if (container && scrollPositionRef.current > 0) {
			container.scrollTop = scrollPositionRef.current;
		}
	}, [ports]);

	// Filter ports
	const filteredPorts = usePortFiltering(ports || []);

	// Apply sorting to filtered ports
	const { sortedPorts, sortField, sortOrder, handleSort } = usePortSorting(filteredPorts);

	const handleKillClick = (port: PortInfo) => {
		openKillDialog(port);
	};

	const handleRowClick = (port: PortInfo) => {
		setDetailDialogPort(port);
		setIsDetailDialogOpen(true);
	};

	const handleRefresh = () => {
		mutate();
		toast.success("Refreshing", {
			description: "Port list has been refreshed",
		});
	};

	// Batch operations
	const handleSelectAll = () => {
		const allPortNumbers = sortedPorts.map((p) => p.port);
		selectAllPorts(allPortNumbers);
	};

	const handleDeselectAll = () => {
		deselectAllPorts();
	};

	const handleBatchKill = () => {
		if (selectedPorts.size === 0) {
			toast.error("No ports selected", {
				description: "Please select at least one port to kill",
			});
			return;
		}
		openBatchKillDialog();
	};

	const isAllSelected = sortedPorts.length > 0 && selectedPorts.size === sortedPorts.length;
	const isSomeSelected = selectedPorts.size > 0 && selectedPorts.size < sortedPorts.length;

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
							{`/// ${t("table.title")}`}
						</h2>
						<p className="text-sm text-black dark:text-white font-mono">
							{isLoading
								? t("table.stats.loading")
								: t("table.stats.info", {
										filtered: sortedPorts.length,
										total: ports?.length || 0,
										interval: TIMING.AUTO_REFRESH_INTERVAL / 1000,
										time: lastUpdatedTime,
									})}
						</p>
					</div>
					<Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
						<RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						{t("actions.refresh")}
					</Button>
				</div>

				<SearchBar value={searchQuery} onChange={setSearchQuery} />

				{/* Category filter buttons */}
				<div className="flex flex-wrap gap-2">
					{(
						[
							"all",
							"development",
							"database",
							"web-server",
							"applications",
							"system",
							"user",
						] as const
					).map((category) => {
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
								<span>{t(CATEGORY_I18N_KEYS[category])}</span>
							</Button>
						);
					})}
				</div>

				{/* Batch operations toolbar */}
				{selectedPorts.size > 0 && (
					<div className="flex items-center justify-between p-3 rounded-lg border-2 border-black dark:border-white bg-[#FFD93D] shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,1)]">
						<div className="flex items-center gap-2">
							<span className="font-mono font-bold text-black">
								{t("table.selectedCount", { count: selectedPorts.size })}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={handleDeselectAll}>
								{t("table.deselectAll")}
							</Button>
							<Button variant="destructive" size="sm" onClick={handleBatchKill}>
								<Trash2 className="mr-2 h-4 w-4" />
								{t("actions.batchKill")}
							</Button>
						</div>
					</div>
				)}

				<div
					ref={scrollContainerRef}
					className="rounded-lg border-2 border-black dark:border-white overflow-auto shadow-[0px_2px_0px_rgba(0,0,0,1)] dark:shadow-[0px_2px_0px_rgba(255,255,255,1)]"
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[50px] pl-4">
									<Checkbox
										checked={isAllSelected}
										ref={(el) => {
											if (el) {
												// @ts-expect-error - indeterminate is not in the type definition but is supported
												el.indeterminate = isSomeSelected;
											}
										}}
										onCheckedChange={(checked) => {
											if (checked) {
												handleSelectAll();
											} else {
												handleDeselectAll();
											}
										}}
									/>
								</TableHead>
								<TableHead
									className="w-[100px] cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									onClick={() => handleSort("port")}
								>
									<div className="flex items-center gap-1">
										<span>{t("table.headers.port")}</span>
										{sortField === "port" &&
											(sortOrder === "asc" ? (
												<ArrowUp className="h-3 w-3" />
											) : (
												<ArrowDown className="h-3 w-3" />
											))}
									</div>
								</TableHead>
								<TableHead
									className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									onClick={() => handleSort("processName")}
								>
									<div className="flex items-center gap-1">
										<span>{t("table.headers.processName")}</span>
										{sortField === "processName" &&
											(sortOrder === "asc" ? (
												<ArrowUp className="h-3 w-3" />
											) : (
												<ArrowDown className="h-3 w-3" />
											))}
									</div>
								</TableHead>
								<TableHead
									className="hidden lg:table-cell w-[100px] cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									onClick={() => handleSort("pid")}
								>
									<div className="flex items-center gap-1">
										<span>{t("table.headers.pid")}</span>
										{sortField === "pid" &&
											(sortOrder === "asc" ? (
												<ArrowUp className="h-3 w-3" />
											) : (
												<ArrowDown className="h-3 w-3" />
											))}
									</div>
								</TableHead>
								<TableHead
									className="hidden lg:table-cell w-[120px] cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									onClick={() => handleSort("connectionStatus")}
								>
									<div className="flex items-center gap-1">
										<span>{t("table.headers.status")}</span>
										{sortField === "connectionStatus" &&
											(sortOrder === "asc" ? (
												<ArrowUp className="h-3 w-3" />
											) : (
												<ArrowDown className="h-3 w-3" />
											))}
									</div>
								</TableHead>
								<TableHead
									className="hidden lg:table-cell w-[100px] cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									onClick={() => handleSort("cpuUsage")}
								>
									<div className="flex items-center gap-1">
										<span>{t("table.headers.cpu")}</span>
										{sortField === "cpuUsage" &&
											(sortOrder === "asc" ? (
												<ArrowUp className="h-3 w-3" />
											) : (
												<ArrowDown className="h-3 w-3" />
											))}
									</div>
								</TableHead>
								<TableHead
									className="hidden lg:table-cell w-[120px] cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									onClick={() => handleSort("memoryUsage")}
								>
									<div className="flex items-center gap-1">
										<span>{t("table.headers.memory")}</span>
										{sortField === "memoryUsage" &&
											(sortOrder === "asc" ? (
												<ArrowUp className="h-3 w-3" />
											) : (
												<ArrowDown className="h-3 w-3" />
											))}
									</div>
								</TableHead>
								<TableHead className="w-[100px] pr-4">{t("table.headers.actions")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={8} className="h-24 text-center md:table-cell">
										<div className="flex items-center justify-center">
											<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
											Loading ports...
										</div>
									</TableCell>
								</TableRow>
							) : sortedPorts.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} className="h-24 text-center md:table-cell">
										{ports?.length === 0
											? t("table.noResults")
											: `${t("table.noResults")} (${t(CATEGORY_I18N_KEYS[categoryFilter])})`}
									</TableCell>
								</TableRow>
							) : (
								sortedPorts.map((port) => (
									<PortRow
										key={`${port.pid}-${port.port}`}
										port={port}
										onKillClick={handleKillClick}
										onRowClick={handleRowClick}
										isSelected={selectedPorts.has(port.port)}
										onToggleSelection={togglePortSelection}
									/>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			<KillDialog
				open={isKillDialogOpen}
				onClose={closeKillDialog}
				port={selectedPort}
				onKillSuccess={mutate}
			/>

			<BatchKillDialog
				open={isBatchKillDialogOpen}
				onClose={() => {
					closeBatchKillDialog();
					deselectAllPorts();
				}}
				ports={ports || []}
				onKillSuccess={mutate}
			/>

			<PortDetailDialog
				key={detailDialogPort?.port ?? "closed"}
				open={isDetailDialogOpen}
				onClose={() => setIsDetailDialogOpen(false)}
				port={detailDialogPort}
				onKillClick={handleKillClick}
				lastUpdatedTime={lastUpdatedTime}
			/>
		</>
	);
}
