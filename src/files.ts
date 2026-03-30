import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

export async function readStructuredFile(filePath: string): Promise<any> {
	const absolutePath = path.resolve(filePath);
	const rawContent = await fs.readFile(absolutePath, 'utf8');
	const extension = path.extname(absolutePath).toLowerCase();

	if (extension === '.yaml' || extension === '.yml') {
		return YAML.parse(rawContent) ?? {};
	}

	if (extension === '.json') {
		return JSON.parse(rawContent);
	}

	try {
		return JSON.parse(rawContent);
	} catch {
		try {
			return YAML.parse(rawContent) ?? {};
		} catch {
			throw new Error(`Unsupported or invalid structured file "${filePath}"`);
		}
	}
}

export async function readBinaryFile(filePath: string): Promise<Buffer> {
	return fs.readFile(path.resolve(filePath));
}
