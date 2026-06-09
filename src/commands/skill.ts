import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from 'commander';
import { getGlobalOptions } from '../cli-config';

const SKILL_NAME = 'brickken';

function pathExists(filePath: string): boolean {
	try {
		fs.accessSync(filePath);
		return true;
	} catch {
		return false;
	}
}

function findPackageRoot(startDir: string): string | undefined {
	let current = path.resolve(startDir);

	for (let depth = 0; depth < 8; depth += 1) {
		const skillPath = path.join(current, 'skills', SKILL_NAME, 'SKILL.md');
		const packagePath = path.join(current, 'package.json');
		if (pathExists(skillPath) && pathExists(packagePath)) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}

	return undefined;
}

export function getBundledSkillPath(): string {
	const packageRoot = findPackageRoot(__dirname);
	if (!packageRoot) {
		throw new Error('Unable to find bundled Brickken skill in this package.');
	}

	return path.join(packageRoot, 'skills', SKILL_NAME);
}

export function getDefaultSkillsDirectory(): string {
	const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
	return path.join(codexHome, 'skills');
}

function print(program: Command, humanText: string, jsonValue: Record<string, unknown>): void {
	if (getGlobalOptions(program).json) {
		console.log(JSON.stringify(jsonValue, null, 2));
		return;
	}

	console.log(humanText);
}

function copyDirectory(source: string, destination: string, force: boolean): void {
	if (pathExists(destination)) {
		if (!force) {
			throw new Error(`Skill already exists at ${destination}. Pass --force to overwrite it.`);
		}
		fs.rmSync(destination, { recursive: true, force: true });
	}

	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.cpSync(source, destination, { recursive: true });
}

export function registerSkillCommands(program: Command): void {
	const skill = program
		.command('skill')
		.description('Locate or install the bundled Brickken Codex skill');

	skill
		.command('path')
		.description('Print the bundled Brickken skill path')
		.action(() => {
			const skillPath = getBundledSkillPath();
			print(program, skillPath, { skill: SKILL_NAME, path: skillPath });
		});

	skill
		.command('install')
		.description('Install the bundled Brickken skill into a Codex skills directory')
		.option('--path <directory>', 'Target skills directory')
		.option('--force', 'Overwrite an existing installed skill')
		.action((options, command) => {
			const sourcePath = getBundledSkillPath();
			const skillsDirectory = path.resolve(options.path || getDefaultSkillsDirectory());
			const targetPath = path.join(skillsDirectory, SKILL_NAME);

			copyDirectory(sourcePath, targetPath, Boolean(options.force));
			print(program, `Installed Brickken skill to ${targetPath}`, {
				skill: SKILL_NAME,
				sourcePath,
				targetPath
			});
		});
}
