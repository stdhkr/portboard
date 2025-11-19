import { atom } from "jotai";

const LOCAL_STORAGE_PREFIX = "portboard:";

/**
 * Create a Jotai atom that persists to localStorage
 * @param key - localStorage key (will be prefixed with "portboard:")
 * @param initialValue - Initial value to use if no stored value exists
 * @returns Jotai atom with localStorage persistence
 */
export function atomWithStorage<T>(key: string, initialValue: T) {
	const prefixedKey = `${LOCAL_STORAGE_PREFIX}${key}`;

	// Helper to get stored value
	const getStoredValue = (): T => {
		if (typeof window === "undefined") {
			return initialValue;
		}

		try {
			const item = localStorage.getItem(prefixedKey);
			return item ? JSON.parse(item) : initialValue;
		} catch (error) {
			console.warn(`Error loading localStorage key "${prefixedKey}":`, error);
			return initialValue;
		}
	};

	// Create base atom with stored value
	const baseAtom = atom(getStoredValue());

	// Create derived atom with read/write logic
	const derivedAtom = atom(
		(get) => get(baseAtom),
		(_get, set, newValue: T) => {
			set(baseAtom, newValue);

			// Persist to localStorage
			if (typeof window !== "undefined") {
				try {
					localStorage.setItem(prefixedKey, JSON.stringify(newValue));
				} catch (error) {
					console.error(`Error saving localStorage key "${prefixedKey}":`, error);
				}
			}
		},
	);

	return derivedAtom;
}
