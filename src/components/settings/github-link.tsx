import { useAtom } from "jotai";
import githubMarkBlack from "@/assets/github-mark.svg";
import githubMarkWhite from "@/assets/github-mark-white.svg";
import { Button } from "@/components/brutalist";
import { themeAtom } from "@/store/port-store";

export function GitHubLink() {
	const [theme] = useAtom(themeAtom);

	return (
		<Button variant="outline" size="icon-sm" asChild>
			<a
				href="https://github.com/stdhkr/portboard"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="View on GitHub"
			>
				<img
					src={theme === "dark" ? githubMarkWhite : githubMarkBlack}
					alt="GitHub"
					className="h-4 w-4"
				/>
			</a>
		</Button>
	);
}
