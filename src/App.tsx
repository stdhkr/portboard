import { PortTable } from "@/components/port-table";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/toaster";

function App() {
	return (
		<div className="min-h-screen bg-[#f5f5f5] dark:bg-[#1a1a1a]">
			<div className="container mx-auto p-8">
				<div className="mb-8 flex items-start justify-between">
					<div>
						<h1 className="text-4xl font-bold text-black dark:text-white font-mono">PORTBOARD</h1>
						<p className="mt-2 text-black dark:text-white font-mono">
							{"/// Open-source port management dashboard"}
						</p>
					</div>
					<ThemeToggle />
				</div>
				<PortTable />
			</div>
			<Toaster />
		</div>
	);
}

export default App;
