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
	const isActive = status === "active";

	return (
		<div className="flex items-center gap-2">
			<span
				className={
					isActive
						? "w-3 h-3 rounded border-2 border-black dark:border-white bg-green-400 dark:bg-green-600"
						: "w-3 h-3 rounded border-2 border-black dark:border-white bg-transparent"
				}
			/>
			<span className="font-mono text-sm">
				{isActive
					? `Active${showConnectionCount ? ` (${connectionCount}${connectionCount === 1 ? " connection" : " connections"})` : ` (${connectionCount})`}`
					: "Idle"}
			</span>
		</div>
	);
}
