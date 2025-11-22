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
			image.includes("elasticsearch") ||
			image.includes("dynamodb") ||
			image.includes("cosmosdb") ||
			image.includes("couchdb") ||
			image.includes("neo4j") ||
			image.includes("influxdb") ||
			image.includes("timescaledb") ||
			image.includes("clickhouse") ||
			image.includes("cockroachdb") ||
			image.includes("yugabytedb") ||
			image.includes("scylladb") ||
			image.includes("arangodb") ||
			image.includes("orientdb") ||
			image.includes("rethinkdb") ||
			image.includes("memcached") ||
			image.includes("valkey") ||
			image.includes("dragonfly")
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
	const procName = processName.toLowerCase();

	// System processes (macOS)
	if (
		path.startsWith("/system/") ||
		processName === "rapportd" ||
		processName === "ControlCenter" ||
		name.includes("kernel") ||
		name.includes("launchd")
	) {
		return "system";
	}

	// System processes (Windows)
	if (
		procName === "system" ||
		procName === "svchost" ||
		procName === "services" ||
		procName === "lsass" ||
		procName === "csrss" ||
		procName === "wininit" ||
		procName === "winlogon" ||
		procName === "smss" ||
		procName === "spoolsv" ||
		procName === "dwm" ||
		procName === "taskhostw" ||
		procName === "runtimebroker" ||
		procName === "searchhost" ||
		procName === "sihost" ||
		procName === "fontdrvhost" ||
		path.includes("\\windows\\system32\\") ||
		path.includes("\\windows\\syswow64\\")
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
		name.includes("sqlite") ||
		name.includes("dynamodb") ||
		name.includes("cosmosdb") ||
		name.includes("couchdb") ||
		name.includes("neo4j") ||
		name.includes("influxdb") ||
		name.includes("timescaledb") ||
		name.includes("clickhouse") ||
		name.includes("cockroachdb") ||
		name.includes("yugabytedb") ||
		name.includes("scylladb") ||
		name.includes("arangodb") ||
		name.includes("orientdb") ||
		name.includes("rethinkdb") ||
		name.includes("memcached") ||
		name.includes("valkey") ||
		name.includes("dragonfly")
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

	// Applications (macOS .app bundles in /Applications)
	// Check this BEFORE language runtimes to catch GUI apps
	if (commandPath?.startsWith("/Applications/") && commandPath.includes(".app")) {
		return "applications";
	}

	// CLI tools and language runtimes (even if packaged as .app)
	if (
		name.includes("python") ||
		name.includes("ruby") ||
		name.includes("perl") ||
		name.includes("php") ||
		name.includes("go") ||
		name.includes("java") ||
		name.includes("node") ||
		name.includes("deno") ||
		name.includes("bun")
	) {
		return "user";
	}

	// Other .app bundles (Homebrew, Frameworks, etc.)
	if (commandPath?.includes(".app")) {
		return "applications";
	}

	// Default to user application (CLI tools, scripts, etc.)
	return "user";
}
