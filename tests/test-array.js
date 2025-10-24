// test-array.js
// Tests for NDArray class and array utilities

const { describe, it } = require('node:test');
const { assert, assertArrayEqual, loadSourceFile } = require('./test-helpers.js');

// Polyfill browser globals for Node.js
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

// Load array source with required globals
const context = loadSourceFile('array.js', {
	Uint8Array,
	Uint16Array,
	Uint32Array,
	Int8Array,
	Int16Array,
	Int32Array,
	Float32Array,
	Float64Array,
	BigInt64Array,
	BigUint64Array,
	DataView,
	atob: global.atob,
	btoa: global.btoa
});

const { NDArray } = context;

describe('NDArray constructor', () => {

	it('creates 1D array', () => {
		const data = new Float32Array([1, 2, 3]);
		const arr = new NDArray(data, [3], 'float32');
		assert.strictEqual(arr.ndim, 1);
		assert.deepStrictEqual(arr.shape, [3]);
		assert.strictEqual(arr.dtype, 'float32');
	});

	it('creates 2D array', () => {
		const data = new Float32Array([1, 2, 3, 4]);
		const arr = new NDArray(data, [2, 2], 'float32');
		assert.strictEqual(arr.ndim, 2);
		assert.deepStrictEqual(arr.shape, [2, 2]);
	});

	it('validates data length matches shape', () => {
		const data = new Float32Array([1, 2, 3]);
		assert.throws(() => new NDArray(data, [2, 2], 'float32'), /doesn't match shape/);
	});

	it('calculates size from shape', () => {
		const data = new Float32Array([1, 2, 3, 4, 5, 6]);
		const arr = new NDArray(data, [2, 3], 'float32');
		assert.strictEqual(arr._size, 6);
	});
});

describe('NDArray.get()', () => {

	it('gets single element from 1D array', () => {
		const data = new Float32Array([1, 2, 3]);
		const arr = new NDArray(data, [3], 'float32');
		assert.strictEqual(arr.get(0), 1);
		assert.strictEqual(arr.get(1), 2);
		assert.strictEqual(arr.get(2), 3);
	});

	it('gets single element from 2D array', () => {
		const data = new Float32Array([1, 2, 3, 4]);
		const arr = new NDArray(data, [2, 2], 'float32');
		assert.strictEqual(arr.get(0, 0), 1);
		assert.strictEqual(arr.get(0, 1), 2);
		assert.strictEqual(arr.get(1, 0), 3);
		assert.strictEqual(arr.get(1, 1), 4);
	});

	it('handles negative indices', () => {
		const data = new Float32Array([1, 2, 3]);
		const arr = new NDArray(data, [3], 'float32');
		assert.strictEqual(arr.get(-1), 3);
		assert.strictEqual(arr.get(-2), 2);
	});

	it('throws error for out of bounds index', () => {
		const data = new Float32Array([1, 2, 3]);
		const arr = new NDArray(data, [3], 'float32');
		assert.throws(() => arr.get(5), /out of bounds/);
	});

	it('gets slice with null index', () => {
		const data = new Float32Array([1, 2, 3, 4]);
		const arr = new NDArray(data, [2, 2], 'float32');
		const slice = arr.get(0, null);
		assert.ok(slice instanceof NDArray);
		assert.deepStrictEqual(slice.shape, [2]);
		assertArrayEqual(Array.from(slice.data), [1, 2]);
	});
});

describe('NDArray.set()', () => {

	it('sets single element in 1D array', () => {
		const data = new Float32Array([1, 2, 3]);
		const arr = new NDArray(data, [3], 'float32');
		arr.set(1, 99);
		assert.strictEqual(arr.get(1), 99);
	});

	it('sets single element in 2D array', () => {
		const data = new Float32Array([1, 2, 3, 4]);
		const arr = new NDArray(data, [2, 2], 'float32');
		arr.set(0, 1, 99);
		assert.strictEqual(arr.get(0, 1), 99);
	});

	it('sets multiple elements with null index', () => {
		const data = new Float32Array([1, 2, 3, 4]);
		const arr = new NDArray(data, [2, 2], 'float32');
		arr.set(0, null, 99);
		assert.strictEqual(arr.get(0, 0), 99);
		assert.strictEqual(arr.get(0, 1), 99);
	});

	it('sets multiple elements with array', () => {
		const data = new Float32Array([1, 2, 3, 4]);
		const arr = new NDArray(data, [2, 2], 'float32');
		arr.set(0, null, [10, 20]);
		assert.strictEqual(arr.get(0, 0), 10);
		assert.strictEqual(arr.get(0, 1), 20);
	});
});

describe('NDArray.toString()', () => {

	it('formats 1D array', () => {
		const data = new Float32Array([1, 2, 3]);
		const arr = new NDArray(data, [3], 'float32');
		const str = arr.toString();
		assert.ok(str.includes('1'));
		assert.ok(str.includes('2'));
		assert.ok(str.includes('3'));
	});

	it('formats higher dimensional arrays', () => {
		const data = new Float32Array([1, 2, 3, 4]);
		const arr = new NDArray(data, [2, 2], 'float32');
		const str = arr.toString();
		assert.ok(str.includes('2X2'));
		assert.ok(str.includes('float32'));
	});
});

describe('NDArray.inferFormat()', () => {

	it('infers array_list_meta', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_list_meta",
			"data": [[1, 2], [3, 4]]
		};
		assert.strictEqual(NDArray.inferFormat(obj), "array_list_meta");
	});

	it('infers array_b64_meta', () => {
		const obj = {
			"__muutils_format__": "torch.Tensor:array_b64_meta",
			"data": "ABC="
		};
		assert.strictEqual(NDArray.inferFormat(obj), "array_b64_meta");
	});

	it('infers array_hex_meta', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_hex_meta",
			"data": "deadbeef"
		};
		assert.strictEqual(NDArray.inferFormat(obj), "array_hex_meta");
	});

	it('infers zero_dim', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:zero_dim",
			"data": 3.14
		};
		assert.strictEqual(NDArray.inferFormat(obj), "zero_dim");
	});

	it('infers list for plain arrays', () => {
		assert.strictEqual(NDArray.inferFormat([1, 2, 3]), "list");
	});

	it('returns null for plain objects', () => {
		assert.strictEqual(NDArray.inferFormat({}), null);
		assert.strictEqual(NDArray.inferFormat({ foo: "bar" }), null);
	});

	it('returns null for primitives', () => {
		assert.strictEqual(NDArray.inferFormat(null), null);
		assert.strictEqual(NDArray.inferFormat(42), null);
		assert.strictEqual(NDArray.inferFormat("string"), null);
	});
});

describe('NDArray.fromJSON() - array_list_meta', () => {

	it('deserializes array_list_meta format', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_list_meta",
			"shape": [2, 3],
			"dtype": "float32",
			"data": [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]],
			"n_elements": 6
		};
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.shape[0], 2);
		assert.strictEqual(arr.shape[1], 3);
		assert.strictEqual(arr.dtype, "float32");
		assertArrayEqual(Array.from(arr.data), [1, 2, 3, 4, 5, 6]);
	});

	it('handles int64 with BigInt', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_list_meta",
			"shape": [2],
			"dtype": "int64",
			"data": [100, 200],
			"n_elements": 2
		};
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.dtype, "int64");
		assert.strictEqual(arr.data[0], 100n);
		assert.strictEqual(arr.data[1], 200n);
	});
});

describe('NDArray.fromJSON() - array_b64_meta', () => {

	it('deserializes array_b64_meta format', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_b64_meta",
			"shape": [3],
			"dtype": "float32",
			"data": "AACAPwAAAEAAAEBA", // [1.0, 2.0, 3.0]
			"n_elements": 3
		};
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.shape[0], 3);
		assert.strictEqual(arr.dtype, "float32");
		assertArrayEqual(Array.from(arr.data), [1.0, 2.0, 3.0]);
	});

	it('handles different dtypes', () => {
		// uint8: [1, 2, 3]
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_b64_meta",
			"shape": [3],
			"dtype": "uint8",
			"data": "AQID",
			"n_elements": 3
		};
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.dtype, "uint8");
		assertArrayEqual(Array.from(arr.data), [1, 2, 3]);
	});
});

describe('NDArray.fromJSON() - array_hex_meta', () => {

	it('deserializes array_hex_meta format', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_hex_meta",
			"shape": [3],
			"dtype": "uint8",
			"data": "010203",
			"n_elements": 3
		};
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.shape[0], 3);
		assert.strictEqual(arr.dtype, "uint8");
		assertArrayEqual(Array.from(arr.data), [1, 2, 3]);
	});
});

describe('NDArray.fromJSON() - zero_dim', () => {

	it('deserializes zero_dim format', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:zero_dim",
			"shape": [],
			"dtype": "float32",
			"data": 42.0,
			"n_elements": 1
		};
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.shape.length, 0);
		assert.strictEqual(arr.dtype, "float32");
		assert.strictEqual(arr.data[0], 42.0);
	});

	it('handles int64 scalar', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:zero_dim",
			"shape": [],
			"dtype": "int64",
			"data": 12345,
			"n_elements": 1
		};
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.data[0], 12345n);
	});
});

describe('NDArray.fromJSON() - list', () => {

	it('deserializes plain arrays', () => {
		const obj = [1, 2, 3, 4, 5];
		const arr = NDArray.fromJSON(obj);
		assert.strictEqual(arr.shape[0], 5);
		assert.strictEqual(arr.dtype, 'float64');
		assertArrayEqual(Array.from(arr.data), [1, 2, 3, 4, 5]);
	});
});

describe('NDArray.fromJSON() - error handling', () => {

	it('throws error for unrecognized format', () => {
		const obj = { foo: 'bar' };
		assert.throws(() => NDArray.fromJSON(obj), /Cannot infer array format/);
	});

	it('throws error for missing metadata', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_list_meta",
			// Missing shape and dtype
			"data": [[1, 2]]
		};
		assert.throws(() => NDArray.fromJSON(obj), /Missing shape or dtype/);
	});

	it('throws error for unsupported dtype', () => {
		const obj = {
			"__muutils_format__": "numpy.ndarray:array_list_meta",
			"shape": [2],
			"dtype": "complex128", // Unsupported
			"data": [1, 2]
		};
		assert.throws(() => NDArray.fromJSON(obj), /Unsupported dtype/);
	});
});

describe('NDArray dtypes', () => {

	const dtypeTests = [
		{ name: 'uint8', value: 255, constructor: Uint8Array },
		{ name: 'uint16', value: 65535, constructor: Uint16Array },
		{ name: 'uint32', value: 4294967295, constructor: Uint32Array },
		{ name: 'int8', value: -128, constructor: Int8Array },
		{ name: 'int16', value: -32768, constructor: Int16Array },
		{ name: 'int32', value: -2147483648, constructor: Int32Array },
		{ name: 'float32', value: 3.14, constructor: Float32Array },
		{ name: 'float64', value: 3.14159265359, constructor: Float64Array }
	];

	for (const { name, value, constructor } of dtypeTests) {
		it(`handles ${name} dtype`, () => {
			const data = new constructor([value]);
			const arr = new NDArray(data, [1], name);
			assert.strictEqual(arr.dtype, name);
			assert.ok(arr.data instanceof constructor);
		});
	}

	it('handles uint64 with BigUint64Array', () => {
		const data = new BigUint64Array([18446744073709551615n]);
		const arr = new NDArray(data, [1], 'uint64');
		assert.strictEqual(arr.dtype, 'uint64');
		assert.ok(arr.data instanceof BigUint64Array);
	});

	it('handles int64 with BigInt64Array', () => {
		const data = new BigInt64Array([-9223372036854775808n]);
		const arr = new NDArray(data, [1], 'int64');
		assert.strictEqual(arr.dtype, 'int64');
		assert.ok(arr.data instanceof BigInt64Array);
	});
});

describe('NDArray edge cases', () => {

	it('handles empty array', () => {
		const data = new Float32Array([]);
		const arr = new NDArray(data, [0], 'float32');
		assert.strictEqual(arr._size, 0);
		assert.strictEqual(arr.data.length, 0);
	});

	it('handles single element', () => {
		const data = new Float32Array([42]);
		const arr = new NDArray(data, [1], 'float32');
		assert.strictEqual(arr._size, 1);
		assert.strictEqual(arr.get(0), 42);
	});

	it('handles 3D arrays', () => {
		const data = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
		const arr = new NDArray(data, [2, 2, 2], 'float32');
		assert.strictEqual(arr.ndim, 3);
		assert.strictEqual(arr._size, 8);
	});

	it('handles high-dimensional arrays', () => {
		const data = new Float32Array(new Array(16).fill(1));
		const arr = new NDArray(data, [2, 2, 2, 2], 'float32');
		assert.strictEqual(arr.ndim, 4);
		assert.strictEqual(arr._size, 16);
	});
});
