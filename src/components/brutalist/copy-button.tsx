import { useCallback, useState } from "react";

interface CopyButtonProps {
	value: string;
	timeout?: number;
	children: (props: { copied: boolean; copy: () => void }) => React.ReactNode;
}

export const CopyButton = ({ value, timeout = 2000, children }: CopyButtonProps) => {
	const [copied, setCopied] = useState(false);

	const copy = useCallback(() => {
		navigator.clipboard.writeText(value).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), timeout);
		});
	}, [value, timeout]);

	return <>{children({ copied, copy })}</>;
};
