export type ProcessCategory =
	| "system"
	| "development"
	| "database"
	| "web-server"
	| "applications"
	| "user";

export interface DockerContainerInfo {
	id: string;
	name: string;
	image: string;
	containerPort?: number;
	composeConfigFiles?: string;
}

/**
 * Determine the category of a process based on its name, app name, and command path
 */
export function categorizeProcess(
	processName: string,
	appName: string | undefined,
	commandPath: string | undefined,
	dockerContainer?: DockerContainerInfo,
): ProcessCategory {
	// If it's a Docker container, categorize by image name
	if (dockerContainer) {
		const image = dockerContainer.image.toLowerCase();

		// Database containers
		if (
			image.includes("postgres") ||
			image.includes("mysql") ||
			image.includes("mariadb") ||
			image.includes("redis") ||
			image.includes("mongo") ||
			image.includes("cassandra") ||
			image.includes("elasticsearch")
		) {
			return "database";
		}

		// Web server containers
		if (
			image.includes("nginx") ||
			image.includes("apache") ||
			image.includes("caddy") ||
			image.includes("traefik")
		) {
			return "web-server";
		}

		// Default Docker containers to user category
		return "user";
	}

	const name = (appName || processName).toLowerCase();
	const path = (commandPath || "").toLowerCase();

	// System processes
	if (
		path.startsWith("/system/") ||
		processName === "rapportd" ||
		processName === "ControlCenter" ||
		name.includes("kernel") ||
		name.includes("launchd")
	) {
		return "system";
	}

	// Development tools
	if (
		name.includes("visual studio code") ||
		name.includes("code") ||
		name.includes("vscode") ||
		name.includes("cursor") ||
		name.includes("raycast") ||
		name.includes("figma") ||
		name.includes("exosphere") ||
		name.includes("intellij") ||
		name.includes("pycharm") ||
		name.includes("webstorm") ||
		name.includes("goland") ||
		name.includes("android studio") ||
		name.includes("xcode") ||
		name.includes("sublime") ||
		name.includes("atom") ||
		name.includes("vim") ||
		name.includes("emacs") ||
		name.includes("postman") ||
		name.includes("insomnia") ||
		name.includes("docker desktop")
	) {
		return "development";
	}

	// Database servers
	if (
		name.includes("postgres") ||
		name.includes("mysql") ||
		name.includes("mariadb") ||
		name.includes("redis") ||
		name.includes("mongodb") ||
		name.includes("mongo") ||
		name.includes("cassandra") ||
		name.includes("elasticsearch") ||
		name.includes("sqlite")
	) {
		return "database";
	}

	// Web servers
	if (
		name.includes("nginx") ||
		name.includes("apache") ||
		name.includes("httpd") ||
		name.includes("caddy") ||
		name.includes("traefik")
	) {
		return "web-server";
	}

	// Applications (macOS .app bundles)
	if (commandPath && commandPath.includes(".app")) {
		return "applications";
	}

	// Default to user application (CLI tools, scripts, etc.)
	return "user";
}
