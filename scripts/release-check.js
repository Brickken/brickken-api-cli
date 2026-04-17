#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function parseVersion(version, label = 'version') {
	if (!/^\d+\.\d+\.\d+$/.test(String(version))) {
		throw new Error(`Invalid ${label} "${version}". Expected a semantic version like 0.3.0.`);
	}

	return String(version)
		.split('.')
		.map((value) => Number.parseInt(value, 10));
}

function compareVersions(left, right) {
	const leftParts = parseVersion(left, 'left version');
	const rightParts = parseVersion(right, 'right version');

	for (let index = 0; index < 3; index += 1) {
		if (leftParts[index] > rightParts[index]) {
			return 1;
		}

		if (leftParts[index] < rightParts[index]) {
			return -1;
		}
	}

	return 0;
}

function validateRelease({ packageVersion, releaseTag, publishedVersion }) {
	if (!releaseTag) {
		throw new Error('Missing release tag. Set RELEASE_TAG or provide GITHUB_REF_NAME from a tag-triggered workflow.');
	}

	const expectedTag = `v${packageVersion}`;
	if (releaseTag !== expectedTag) {
		throw new Error(
			`Release tag mismatch: expected "${expectedTag}" but received "${releaseTag}".`
		);
	}

	if (publishedVersion && compareVersions(packageVersion, publishedVersion) <= 0) {
		throw new Error(
			`Package version ${packageVersion} must be greater than the published npm version ${publishedVersion}.`
		);
	}
}

function readPackageManifest() {
	const packagePath = path.resolve(__dirname, '..', 'package.json');
	return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
}

function getReleaseTag() {
	return process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || '';
}

function getPublishedVersion(packageName) {
	if (process.env.NPM_LATEST_VERSION) {
		return process.env.NPM_LATEST_VERSION;
	}

	try {
		const raw = execFileSync('npm', ['view', packageName, 'version', '--json'], {
			encoding: 'utf8'
		}).trim();

		if (!raw) {
			return null;
		}

		return JSON.parse(raw);
	} catch (error) {
		const stderr = error && error.stderr ? String(error.stderr) : '';
		if (stderr.includes('E404')) {
			return null;
		}

		throw error;
	}
}

function main() {
	const packageManifest = readPackageManifest();
	const releaseTag = getReleaseTag();
	const publishedVersion = getPublishedVersion(packageManifest.name);

	validateRelease({
		packageVersion: packageManifest.version,
		releaseTag,
		publishedVersion
	});

	console.log(
		`Release check passed for ${packageManifest.name}@${packageManifest.version} with tag ${releaseTag}.`
	);
	if (publishedVersion) {
		console.log(`Published npm version: ${publishedVersion}`);
	}
}

if (require.main === module) {
	try {
		main();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}

module.exports = {
	parseVersion,
	compareVersions,
	validateRelease
};
