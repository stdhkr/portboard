import { PortTable } from "@/components/port-table";
import { Toaster } from "@/components/ui/toaster";

function App() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="container mx-auto p-8">
				<div className="mb-8">
					<h1 className="text-4xl font-bold text-gray-900 dark:text-white">Portboard</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Open-source port management dashboard
					</p>
				</div>
				<PortTable />
			</div>
			<Toaster />
		</div>
	);
}

export default App;
