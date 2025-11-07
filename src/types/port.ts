export type ProcessCategory = "system" | "development" | "database" | "web-server" | "user";

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
	state: string;
	commandPath?: string;
	user?: string;
	appName?: string;
	appIconPath?: string;
	category: ProcessCategory;
	dockerContainer?: DockerContainerInfo;
}
