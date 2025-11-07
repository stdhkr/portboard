export type ProcessCategory = "system" | "development" | "database" | "web-server" | "user";

export type ConnectionStatus = "active" | "idle";

export interface DockerContainerInfo {
	id: string;
	name: string;
	image: string;
	containerPort?: number;
	composeConfigFiles?: string;
}

export interface PortInfo {
	port: number;
	pid: number;
	processName: string;
	protocol: string;
	address: string;
	connectionStatus: ConnectionStatus;
	connectionCount: number;
	lastAccessed?: Date;
	commandPath?: string;
	user?: string;
	appName?: string;
	appIconPath?: string;
	category: ProcessCategory;
	dockerContainer?: DockerContainerInfo;
	cpuUsage?: number;
	memoryUsage?: number;
	memoryRSS?: number;
}
