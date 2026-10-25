const configuredApiBaseUrl =
	import.meta.env.VITE_API_URL ||
	import.meta.env.VITE_API_BASE_URL ||
	'http://localhost:8082/api';

const configuredApiTimeoutMs = Number(
	import.meta.env.VITE_API_TIMEOUT_MS || 30000
);

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, '');
export const API_ROOT_URL = API_BASE_URL.endsWith('/api')
	? API_BASE_URL.slice(0, -4)
	: API_BASE_URL;
export const API_TIMEOUT_MS = Number.isFinite(configuredApiTimeoutMs)
	? configuredApiTimeoutMs
	: 30000;
