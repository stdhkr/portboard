import { RefreshCw } from "lucide-react";
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
import type { PortInfo } from "@/types/port";

interface KillDialogProps {
	open: boolean;
	onClose: () => void;
	port: PortInfo | null;
	onKillSuccess: () => void;
}

export function KillDialog({ open, onClose, port, onKillSuccess }: KillDialogProps) {
	const [isKilling, setIsKilling] = useState(false);

	const handleKillConfirm = async () => {
		if (!port) return;

		setIsKilling(true);
		try {
			await killProcess(port.pid);
			toast.success("Process killed", {
				description: `Successfully killed process ${port.processName} (PID: ${port.pid})`,
			});
			onClose();
			onKillSuccess();
		} catch (error) {
			toast.error("Failed to kill process", {
				description: error instanceof Error ? error.message : "Unknown error occurred",
			});
		} finally {
			setIsKilling(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Kill Process</DialogTitle>
					<DialogDescription>
						{port?.category === "development" ? (
							<span className="text-yellow-600 dark:text-yellow-400">
								⚠️ You are about to kill a development tool process. It is recommended to close the
								application itself instead of killing the process.
							</span>
						) : port?.category === "system" ? (
							<span className="text-red-600 dark:text-red-400">
								⚠️ Killing system processes is not recommended and may cause instability.
							</span>
						) : (
							"Are you sure you want to kill this process? This action cannot be undone."
						)}
					</DialogDescription>
				</DialogHeader>
				{port && (
					<div className="space-y-2 rounded-lg border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900 p-4">
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">PROCESS</span>
							<span className="font-mono text-black dark:text-white flex items-center gap-2">
								{(() => {
									const SelectedIcon = CATEGORY_INFO[port.category].icon;
									return <SelectedIcon className="h-4 w-4" />;
								})()}
								<span>{port.appName || port.processName}</span>
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">CATEGORY</span>
							<span className="font-mono text-black dark:text-white">
								{CATEGORY_INFO[port.category].label}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">PID</span>
							<span className="font-mono text-black dark:text-white">{port.pid}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">PORT</span>
							<span className="font-mono text-black dark:text-white">{port.port}</span>
						</div>
					</div>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant={
							port?.category === "system" || port?.category === "development"
								? "ghost"
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
	);
}
