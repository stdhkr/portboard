import { useAtomValue, useSetAtom } from "jotai";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { fetchPorts, killProcess } from "@/lib/api";
import {
	closeKillDialogAtom,
	isKillDialogOpenAtom,
	openKillDialogAtom,
	selectedPortAtom,
} from "@/store/port-store";
import type { PortInfo } from "@/types/port";

const REFRESH_INTERVAL = 5000; // 5 seconds

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

	const [isKilling, setIsKilling] = useState(false);

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
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
				<h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading ports</h3>
				<p className="mt-1 text-sm text-red-700 dark:text-red-300">
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
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white">Listening Ports</h2>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{isLoading ? "Loading..." : `${ports?.length || 0} port(s) found · Auto-refresh: 5s`}
						</p>
					</div>
					<Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
						<RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
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
							) : ports?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										No listening ports found
									</TableCell>
								</TableRow>
							) : (
								ports?.map((port) => (
									<TableRow key={`${port.pid}-${port.port}`}>
										<TableCell className="font-mono font-medium">{port.port}</TableCell>
										<TableCell className="font-medium">{port.processName}</TableCell>
										<TableCell className="font-mono">{port.pid}</TableCell>
										<TableCell>{port.protocol}</TableCell>
										<TableCell className="font-mono">{port.address}</TableCell>
										<TableCell>
											<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
												{port.state}
											</span>
										</TableCell>
										<TableCell className="text-right">
											<Button variant="destructive" size="sm" onClick={() => handleKillClick(port)}>
												<X className="mr-1 h-3 w-3" />
												Kill
											</Button>
										</TableCell>
									</TableRow>
								))
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
							Are you sure you want to kill this process? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					{selectedPort && (
						<div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
							<div className="flex justify-between text-sm">
								<span className="font-medium text-gray-500 dark:text-gray-400">Process:</span>
								<span className="font-medium text-gray-900 dark:text-white">
									{selectedPort.processName}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-medium text-gray-500 dark:text-gray-400">PID:</span>
								<span className="font-mono text-gray-900 dark:text-white">{selectedPort.pid}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="font-medium text-gray-500 dark:text-gray-400">Port:</span>
								<span className="font-mono text-gray-900 dark:text-white">{selectedPort.port}</span>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={closeKillDialog}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleKillConfirm} disabled={isKilling}>
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
