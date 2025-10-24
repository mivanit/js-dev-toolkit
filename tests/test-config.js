// test-config.js
// Tests for configuration management system

const { describe, it, before } = require('node:test');
const { assert, createMockDOM, loadSourceFile } = require('./test-helpers.js');

// Create mock DOM
const mockDOM = createMockDOM();
const { window } = mockDOM;

// Mock fetch
const mockFetch = async (url, options) => {
	if (url === 'config.json') {
		return {
			ok: true,
			json: async () => ({
				theme: 'dark',
				debug: true
			})
		};
	}
	return { ok: false, status: 404 };
};

// Load config source with mocked globals
const context = loadSourceFile('config.js', {
	window,
	fetch: mockFetch,
	console,
	setTimeout: global.setTimeout,
	clearTimeout: global.clearTimeout
});

const {
	deepMerge,
	setNestedConfigValue,
	getConfigValue,
	setConfigValue,
	encodeForURL,
	findConfigDifferences,
	arraysEqual,
	shouldSkipInURL,
	shouldSkipInComparison
} = context;

describe('deepMerge()', () => {

	it('merges simple objects', () => {
		const target = { a: 1, b: 2 };
		const source = { b: 3, c: 4 };
		deepMerge(target, source);
		assert.deepStrictEqual(target, { a: 1, b: 3, c: 4 });
	});

	it('merges nested objects', () => {
		const target = { a: { x: 1 } };
		const source = { a: { y: 2 } };
		deepMerge(target, source);
		assert.deepStrictEqual(target, { a: { x: 1, y: 2 } });
	});

	it('overwrites primitives', () => {
		const target = { a: 1 };
		const source = { a: 2 };
		deepMerge(target, source);
		assert.strictEqual(target.a, 2);
	});

	it('handles arrays by replacement', () => {
		const target = { arr: [1, 2, 3] };
		const source = { arr: [4, 5] };
		deepMerge(target, source);
		assert.deepStrictEqual(target.arr, [4, 5]);
	});

	it('creates nested objects if missing', () => {
		const target = {};
		const source = { a: { b: { c: 1 } } };
		deepMerge(target, source);
		assert.deepStrictEqual(target, { a: { b: { c: 1 } } });
	});

	it('does not modify source', () => {
		const target = { a: 1 };
		const source = { b: 2 };
		const sourceCopy = { ...source };
		deepMerge(target, source);
		assert.deepStrictEqual(source, sourceCopy);
	});
});

describe('setNestedConfigValue()', () => {

	it('sets simple property', () => {
		const obj = {};
		setNestedConfigValue(obj, 'key', 'value');
		assert.strictEqual(obj.key, 'value');
	});

	it('sets nested property', () => {
		const obj = {};
		setNestedConfigValue(obj, 'a.b.c', 'value');
		assert.strictEqual(obj.a.b.c, 'value');
	});

	it('creates intermediate objects', () => {
		const obj = {};
		setNestedConfigValue(obj, 'user.name', 'Alice');
		assert.ok(obj.user);
		assert.strictEqual(obj.user.name, 'Alice');
	});

	it('overwrites existing values', () => {
		const obj = { key: 'old' };
		setNestedConfigValue(obj, 'key', 'new');
		assert.strictEqual(obj.key, 'new');
	});

	it('handles deep nesting', () => {
		const obj = {};
		setNestedConfigValue(obj, 'a.b.c.d.e', 'deep');
		assert.strictEqual(obj.a.b.c.d.e, 'deep');
	});
});

describe('getConfigValue()', () => {

	it('gets simple property', () => {
		// Mock CONFIG
		context.CONFIG = { key: 'value' };
		assert.strictEqual(getConfigValue('key'), 'value');
	});

	it('gets nested property', () => {
		context.CONFIG = { a: { b: { c: 'value' } } };
		assert.strictEqual(getConfigValue('a.b.c'), 'value');
	});

	it('returns undefined for missing property', () => {
		context.CONFIG = { key: 'value' };
		assert.strictEqual(getConfigValue('missing'), undefined);
	});

	it('returns default value for missing property', () => {
		context.CONFIG = { key: 'value' };
		assert.strictEqual(getConfigValue('missing', 'default'), 'default');
	});

	it('handles null in chain', () => {
		context.CONFIG = { a: null };
		assert.strictEqual(getConfigValue('a.b'), undefined);
	});
});

describe('setConfigValue()', () => {

	it('sets config value', () => {
		context.CONFIG = {};
		setConfigValue('key', 'value', false);
		assert.strictEqual(context.CONFIG.key, 'value');
	});

	it('sets nested config value', () => {
		context.CONFIG = {};
		setConfigValue('a.b.c', 'value', false);
		assert.strictEqual(context.CONFIG.a.b.c, 'value');
	});

	it('does not update URL when updateUrl=false', () => {
		context.CONFIG = {};
		context.URL_UPDATE_TIMEOUT = null;
		setConfigValue('key', 'value', false);
		assert.strictEqual(context.URL_UPDATE_TIMEOUT, null);
	});
});

describe('encodeForURL()', () => {

	it('returns value as-is by default', () => {
		assert.strictEqual(encodeForURL('test'), 'test');
		assert.strictEqual(encodeForURL(42), 42);
		assert.strictEqual(encodeForURL(true), true);
	});

	it('handles various types', () => {
		assert.strictEqual(encodeForURL('string'), 'string');
		assert.strictEqual(encodeForURL(123), 123);
		assert.strictEqual(encodeForURL(false), false);
	});
});

describe('arraysEqual()', () => {

	it('returns true for equal arrays', () => {
		assert.strictEqual(arraysEqual([1, 2, 3], [1, 2, 3]), true);
	});

	it('returns false for different lengths', () => {
		assert.strictEqual(arraysEqual([1, 2], [1, 2, 3]), false);
	});

	it('returns false for different values', () => {
		assert.strictEqual(arraysEqual([1, 2, 3], [1, 2, 4]), false);
	});

	it('handles empty arrays', () => {
		assert.strictEqual(arraysEqual([], []), true);
	});

	it('compares strings', () => {
		assert.strictEqual(arraysEqual(['a', 'b'], ['a', 'b']), true);
		assert.strictEqual(arraysEqual(['a', 'b'], ['a', 'c']), false);
	});
});

describe('findConfigDifferences()', () => {

	it('finds primitive differences', () => {
		const current = { a: 1, b: 2 };
		const base = { a: 1, b: 3 };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
		assert.deepStrictEqual(diffs[0], ['b', 2]);
	});

	it('finds nested differences', () => {
		const current = { user: { name: 'Alice', age: 30 } };
		const base = { user: { name: 'Bob', age: 30 } };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
		assert.deepStrictEqual(diffs[0], ['user.name', 'Alice']);
	});

	it('finds array differences', () => {
		const current = { arr: [1, 2, 3] };
		const base = { arr: [1, 2, 4] };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
		assert.deepStrictEqual(diffs[0], ['arr', [1, 2, 3]]);
	});

	it('uses epsilon for float comparison', () => {
		const current = { value: 1.0 };
		const base = { value: 1.00001 };
		const diffs = findConfigDifferences(current, base);
		// Should be considered equal due to epsilon
		assert.strictEqual(diffs.length, 0);
	});

	it('detects significant float differences', () => {
		const current = { value: 1.0 };
		const base = { value: 1.1 };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
	});

	it('handles missing keys in base', () => {
		const current = { a: 1, b: 2 };
		const base = { a: 1 };
		const diffs = findConfigDifferences(current, base);
		// b is new, should be included
		assert.ok(diffs.some(([key]) => key === 'b'));
	});

	it('returns empty for identical configs', () => {
		const current = { a: 1, b: { c: 2 } };
		const base = { a: 1, b: { c: 2 } };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 0);
	});
});

describe('shouldSkipInURL()', () => {

	it('returns false for normal paths', () => {
		assert.strictEqual(shouldSkipInURL('theme'), false);
		assert.strictEqual(shouldSkipInURL('user.name'), false);
	});

	it('handles empty path', () => {
		assert.strictEqual(shouldSkipInURL(''), false);
	});
});

describe('shouldSkipInComparison()', () => {

	it('returns false for normal keys', () => {
		assert.strictEqual(shouldSkipInComparison('theme'), false);
		assert.strictEqual(shouldSkipInComparison('debug'), false);
	});

	it('handles empty key', () => {
		assert.strictEqual(shouldSkipInComparison(''), false);
	});
});

describe('Configuration system integration', () => {

	it('merges default with inline config', () => {
		// This tests the getDefaultConfig behavior
		const getDefaultConfig = context.getDefaultConfig;
		const config = getDefaultConfig();
		assert.ok(config);
		assert.ok(typeof config === 'object');
	});
});

describe('URL parameter handling', () => {

	it('parses boolean from URL', () => {
		const decodeFromURL = context.decodeFromURL || context.parseConfigValue;
		if (decodeFromURL) {
			assert.strictEqual(decodeFromURL('true'), true);
			assert.strictEqual(decodeFromURL('false'), false);
		}
	});

	it('parses number from URL', () => {
		const decodeFromURL = context.decodeFromURL || context.parseConfigValue;
		if (decodeFromURL) {
			assert.strictEqual(decodeFromURL('42'), 42);
			assert.strictEqual(decodeFromURL('3.14'), 3.14);
		}
	});

	it('keeps string as-is', () => {
		const decodeFromURL = context.decodeFromURL || context.parseConfigValue;
		if (decodeFromURL) {
			assert.strictEqual(decodeFromURL('hello'), 'hello');
		}
	});
});

describe('Edge cases', () => {

	it('handles null values', () => {
		const obj = {};
		setNestedConfigValue(obj, 'key', null);
		assert.strictEqual(obj.key, null);
	});

	it('handles undefined values', () => {
		const obj = {};
		setNestedConfigValue(obj, 'key', undefined);
		assert.strictEqual(obj.key, undefined);
	});

	it('handles boolean values', () => {
		const obj = {};
		setNestedConfigValue(obj, 'key', false);
		assert.strictEqual(obj.key, false);
	});

	it('handles number values', () => {
		const obj = {};
		setNestedConfigValue(obj, 'key', 0);
		assert.strictEqual(obj.key, 0);
	});

	it('handles empty string values', () => {
		const obj = {};
		setNestedConfigValue(obj, 'key', '');
		assert.strictEqual(obj.key, '');
	});

	it('deep merge handles complex nested structures', () => {
		const target = {
			a: { x: 1, y: { z: 2 } },
			b: [1, 2]
		};
		const source = {
			a: { y: { w: 3 }, v: 4 },
			c: 5
		};
		deepMerge(target, source);
		assert.strictEqual(target.a.x, 1);
		assert.strictEqual(target.a.y.z, 2);
		assert.strictEqual(target.a.y.w, 3);
		assert.strictEqual(target.a.v, 4);
		assert.strictEqual(target.c, 5);
	});
});

describe('Configuration differences with special types', () => {

	it('handles boolean differences', () => {
		const current = { flag: true };
		const base = { flag: false };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
		assert.deepStrictEqual(diffs[0], ['flag', true]);
	});

	it('handles string differences', () => {
		const current = { text: 'hello' };
		const base = { text: 'world' };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
		assert.deepStrictEqual(diffs[0], ['text', 'hello']);
	});

	it('handles null vs undefined', () => {
		const current = { value: null };
		const base = { value: undefined };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
	});

	it('handles 0 vs false', () => {
		const current = { value: 0 };
		const base = { value: false };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
	});

	it('handles empty string vs undefined', () => {
		const current = { value: '' };
		const base = { value: undefined };
		const diffs = findConfigDifferences(current, base);
		assert.strictEqual(diffs.length, 1);
	});
});
