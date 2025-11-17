import { RefreshCw } from "lucide-react";
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
import type { PortInfo } from "@/types/port";

interface KillDialogProps {
	open: boolean;
	onClose: () => void;
	port: PortInfo | null;
	onKillSuccess: () => void;
}

export function KillDialog({ open, onClose, port, onKillSuccess }: KillDialogProps) {
	const { t } = useTranslation();
	const [isKilling, setIsKilling] = useState(false);
	const [isStoppingContainer, setIsStoppingContainer] = useState(false);
	const [isStoppingCompose, setIsStoppingCompose] = useState(false);

	const handleKillConfirm = async () => {
		if (!port) return;

		setIsKilling(true);
		try {
			await killProcess(port.pid);
			toast.success(t("toast.killSuccess"), {
				description: `Successfully killed process ${port.processName} (PID: ${port.pid})`,
			});
			onClose();
			onKillSuccess();
		} catch (error) {
			toast.error(
				t("toast.killError", { error: error instanceof Error ? error.message : "Unknown error" }),
			);
		} finally {
			setIsKilling(false);
		}
	};

	const handleStopContainer = async () => {
		if (!port?.dockerContainer) return;

		setIsStoppingContainer(true);
		try {
			await stopDockerContainer(port.dockerContainer.name);
			toast.success(t("toast.dockerStopSuccess"), {
				description: `Successfully stopped container ${port.dockerContainer.name}`,
			});
			onClose();
			onKillSuccess();
		} catch (error) {
			toast.error(
				t("toast.dockerStopError", {
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);
		} finally {
			setIsStoppingContainer(false);
		}
	};

	const handleStopCompose = async () => {
		if (!port?.dockerContainer?.composeConfigFiles) return;

		const projectDir = port.dockerContainer.composeConfigFiles.substring(
			0,
			port.dockerContainer.composeConfigFiles.lastIndexOf("/"),
		);

		setIsStoppingCompose(true);
		try {
			await stopDockerCompose(projectDir);
			toast.success(t("toast.dockerComposeSuccess"), {
				description: `Successfully stopped compose project in ${projectDir}`,
			});
			onClose();
			onKillSuccess();
		} catch (error) {
			toast.error(
				t("toast.dockerComposeError", {
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			);
		} finally {
			setIsStoppingCompose(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{port?.dockerContainer ? t("dialog.kill.title") : t("dialog.kill.title")}
					</DialogTitle>
					<DialogDescription>
						{port?.isSelfPort ? (
							<span className="text-cyan-600 dark:text-cyan-400 font-bold">
								🛑 {t("dialog.kill.warnings.selfPort")}{" "}
								{t("dialog.kill.warnings.selfPortDescription")}
							</span>
						) : port?.dockerContainer ? (
							<span className="text-orange-600 dark:text-orange-400">
								⚠️ {t("dialog.kill.warnings.dockerDescription")}
							</span>
						) : port?.category === "development" ? (
							<span className="text-yellow-600 dark:text-yellow-400">
								⚠️ {t("dialog.kill.warnings.developmentDescription")}
							</span>
						) : port?.category === "system" ? (
							<span className="text-red-600 dark:text-red-400">
								⚠️ {t("dialog.kill.warnings.systemDescription")}
							</span>
						) : (
							t("dialog.kill.description")
						)}
					</DialogDescription>
				</DialogHeader>
				{port && (
					<div className="space-y-2 rounded-lg border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900 p-4">
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">
								{t("dialog.kill.fields.process")}
							</span>
							<span className="font-mono text-black dark:text-white flex items-center gap-2">
								{(() => {
									const SelectedIcon = CATEGORY_INFO[port.category].icon;
									return <SelectedIcon className="h-4 w-4" />;
								})()}
								<span>{port.appName || port.processName}</span>
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">
								{t("dialog.kill.fields.category")}
							</span>
							<span className="font-mono text-black dark:text-white">
								{t(CATEGORY_I18N_KEYS[port.category])}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">
								{t("dialog.kill.fields.pid")}
							</span>
							<span className="font-mono text-black dark:text-white">{port.pid}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="font-bold font-mono text-black dark:text-white">
								{t("dialog.kill.fields.port")}
							</span>
							<span className="font-mono text-black dark:text-white">{port.port}</span>
						</div>
						{port.dockerContainer ? (
							<div className="flex justify-between text-sm">
								<span className="font-bold font-mono text-black dark:text-white">
									{t("dialog.kill.fields.source")}
								</span>
								<span className="font-mono text-black dark:text-white text-right truncate max-w-[280px]">
									{port.dockerContainer.composeConfigFiles
										? port.dockerContainer.composeConfigFiles.substring(
												0,
												port.dockerContainer.composeConfigFiles.lastIndexOf("/"),
											)
										: "Manual (docker run)"}
								</span>
							</div>
						) : (
							port.cwd &&
							port.cwd !== "/" && (
								<div className="flex justify-between text-sm">
									<span className="font-bold font-mono text-black dark:text-white">
										{t("dialog.kill.fields.cwd")}
									</span>
									<span className="font-mono text-black dark:text-white text-right truncate max-w-[280px]">
										{port.cwd}
									</span>
								</div>
							)
						)}
					</div>
				)}
				{port?.dockerContainer ? (
					<>
						<div className="space-y-3">
							<div className="text-sm font-mono font-bold text-black dark:text-white">
								{t("dialog.kill.dockerActions.recommended")}
							</div>
							<div className="flex flex-col gap-2">
								<Button
									variant="default"
									onClick={handleStopContainer}
									disabled={isStoppingContainer}
								>
									{isStoppingContainer ? (
										<>
											<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
											{t("actions.stopContainer")}...
										</>
									) : (
										`${t("actions.stopContainer")}: ${port.dockerContainer.name}`
									)}
								</Button>
								{port.dockerContainer.composeConfigFiles && (
									<Button
										variant="default"
										onClick={handleStopCompose}
										disabled={isStoppingCompose}
									>
										{isStoppingCompose ? (
											<>
												<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
												{t("actions.stopCompose")}...
											</>
										) : (
											t("actions.stopCompose")
										)}
									</Button>
								)}
							</div>
						</div>
						<div className="space-y-3">
							<div className="text-sm font-mono font-bold text-red-600 dark:text-red-400">
								{t("dialog.kill.dockerActions.advanced")}
							</div>
							<Button
								variant="ghost"
								onClick={handleKillConfirm}
								disabled={isKilling}
								className="w-full"
							>
								{isKilling ? (
									<>
										<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
										{t("actions.kill")}...
									</>
								) : (
									t("actions.kill")
								)}
							</Button>
						</div>
					</>
				) : (
					<DialogFooter>
						<Button variant="outline" onClick={onClose}>
							{t("dialog.kill.cancel")}
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
									{t("actions.kill")}...
								</>
							) : (
								t("dialog.kill.confirm")
							)}
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
