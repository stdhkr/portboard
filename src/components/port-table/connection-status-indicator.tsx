import { useTranslation } from "react-i18next";

interface ConnectionStatusIndicatorProps {
	status: "active" | "idle";
	connectionCount?: number;
	showConnectionCount?: boolean;
}

export function ConnectionStatusIndicator({
	status,
	connectionCount = 0,
	showConnectionCount = true,
}: ConnectionStatusIndicatorProps) {
	const { t } = useTranslation();
	const isActive = status === "active";

	const getConnectionText = () => {
		if (!isActive) {
			return t("connectionStatus.idle");
		}

		const statusText = t("connectionStatus.active");
		if (!showConnectionCount) {
			return `${statusText} (${connectionCount})`;
		}

		const connectionWord =
			connectionCount === 1 ? t("connectionStatus.connection") : t("connectionStatus.connections");
		return `${statusText} (${connectionCount} ${connectionWord})`;
	};

	return (
		<div className="flex items-center gap-2">
			<span
				className={
					isActive
						? "w-3 h-3 rounded border-2 border-black dark:border-white bg-green-400 dark:bg-green-600"
						: "w-3 h-3 rounded border-2 border-black dark:border-white bg-transparent"
				}
			/>
			<span className="font-mono text-sm">{getConnectionText()}</span>
		</div>
	);
}
