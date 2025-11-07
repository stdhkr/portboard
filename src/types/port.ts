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
}
