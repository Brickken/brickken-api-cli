import { randomUUID } from 'crypto';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(value: unknown): value is string {
	return typeof value === 'string' && UUID_V4.test(value);
}

export function resolveUuidV4(value?: string): string {
	const resolved = value === undefined ? randomUUID() : value.trim();
	if (!isUuidV4(resolved)) {
		throw new Error('idempotencyKey must be a UUID v4.');
	}
	return resolved;
}
