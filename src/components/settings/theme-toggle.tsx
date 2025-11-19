import { useAtom } from "jotai";
import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/brutalist";
import { themeAtom } from "@/store/port-store";

export function ThemeToggle() {
	const [theme, setTheme] = useAtom(themeAtom);

	// Apply theme to document on mount and when theme changes
	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [theme]);

	const toggleTheme = () => {
		setTheme(theme === "light" ? "dark" : "light");
	};

	return (
		<Button variant="outline" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
			{theme === "light" ? (
				<>
					<Moon className="h-4 w-4 mr-2" />
					Dark
				</>
			) : (
				<>
					<Sun className="h-4 w-4 mr-2" />
					Light
				</>
			)}
		</Button>
	);
}
