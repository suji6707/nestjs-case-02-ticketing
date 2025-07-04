export function convertMapToArray(map: Map<string, any>): string[] {
	return Array.from(map.entries()).flat();
}

export function convertObjectToArray(obj: Record<string, any>): string[] {
	return Object.entries(obj).flat();
}
