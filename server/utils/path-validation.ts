import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Validation result for directory paths
 */
export interface PathValidationResult {
	valid: boolean;
	error?: string;
	errorCode?: 400 | 404;
}

/**
 * Validate a directory path for Docker Compose operations
 * Checks for:
 * - Allowed characters only (alphanumeric, dots, slashes, hyphens, underscores)
 * - Absolute path requirement
 * - No shell injection characters
 * - Directory existence and accessibility
 *
 * @param directoryPath - The path to validate
 * @returns Promise<PathValidationResult>
 */
export async function validateDirectoryPath(directoryPath: string): Promise<PathValidationResult> {
	// Validate path format (only alphanumeric, dots, slashes, hyphens, underscores)
	if (!/^[\w./-]+$/.test(directoryPath)) {
		return {
			valid: false,
			error:
				"Invalid directory path: only alphanumeric, dots, slashes, hyphens, and underscores allowed",
			errorCode: 400,
		};
	}

	// Validate path is absolute
	if (!path.isAbsolute(directoryPath)) {
		return {
			valid: false,
			error: "Invalid directory path: must be an absolute path",
			errorCode: 400,
		};
	}

	// Validate directory path doesn't contain shell injection characters
	const dangerousChars = [";", "|", "&", "`", "$", "(", ")", "<", ">", "\\", "'", '"'];
	if (dangerousChars.some((char) => directoryPath.includes(char))) {
		return {
			valid: false,
			error: "Invalid directory path: contains dangerous characters",
			errorCode: 400,
		};
	}

	// Verify directory exists and is accessible (async I/O)
	try {
		const stats = await fs.stat(directoryPath);
		if (!stats.isDirectory()) {
			return {
				valid: false,
				error: "Invalid path: not a directory",
				errorCode: 400,
			};
		}
	} catch {
		return {
			valid: false,
			error: `Directory not found or not accessible: ${directoryPath}`,
			errorCode: 404,
		};
	}

	return { valid: true };
}
