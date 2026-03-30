#!/usr/bin/env node

import 'source-map-support/register';
import { buildProgram } from './program';
import { printCliError } from './output';

async function main(): Promise<void> {
	const program = buildProgram();
	await program.parseAsync(process.argv);
}

main().catch((error) => {
	printCliError(error, process.argv.includes('--json'));
	process.exitCode = 1;
});
