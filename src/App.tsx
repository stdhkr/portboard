import { Button } from "@/components/ui/button";

function App() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="container mx-auto p-8">
				<h1 className="text-4xl font-bold text-gray-900 dark:text-white">Portboard</h1>
				<p className="mt-4 text-gray-600 dark:text-gray-400">Port management dashboard</p>
				<Button>Click me</Button>
			</div>
		</div>
	);
}

export default App;
