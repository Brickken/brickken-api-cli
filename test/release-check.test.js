const test = require('node:test');
const assert = require('node:assert/strict');

const {
	compareVersions,
	parseVersion,
	validateRelease
} = require('../scripts/release-check.js');

test('parseVersion accepts standard semantic versions', () => {
	assert.deepEqual(parseVersion('0.3.0'), [0, 3, 0]);
});

test('compareVersions orders semantic versions correctly', () => {
	assert.equal(compareVersions('0.3.0', '0.1.1'), 1);
	assert.equal(compareVersions('0.3.0', '0.3.0'), 0);
	assert.equal(compareVersions('0.1.1', '0.3.0'), -1);
});

test('validateRelease rejects a tag that does not match package.json version', () => {
	assert.throws(
		() =>
			validateRelease({
				packageVersion: '0.3.0',
				releaseTag: 'v0.3.1',
				publishedVersion: '0.1.1'
			}),
		/tag mismatch/i
	);
});

test('validateRelease rejects versions that do not advance npm latest', () => {
	assert.throws(
		() =>
			validateRelease({
				packageVersion: '0.1.1',
				releaseTag: 'v0.1.1',
				publishedVersion: '0.1.1'
			}),
		/must be greater/i
	);
});

test('validateRelease accepts a matching tag and a higher version', () => {
	assert.doesNotThrow(() =>
		validateRelease({
			packageVersion: '0.3.0',
			releaseTag: 'v0.3.0',
			publishedVersion: '0.1.1'
		})
	);
});
