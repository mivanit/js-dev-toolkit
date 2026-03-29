/**
 * @fileoverview NumPy array parsing and utilities
 * @module array
 * @version 0.2.0
 * @license GPLv3
 * @see {@link https://github.com/mivanit/js-dev-toolkit}
 *
 * @note Append ".dev-{name}" to version if you edit this locally
 *
 * @note This file has been modified from original code at:
 * {@link https://github.com/aplbrain/npyjs} under Apache License
 * {@link https://github.com/aplbrain/npyjs/blob/b0cd99b7f4c2bff791b4977e16dec3478519920b/LICENSE}
 *
 * Modifications:
 * - npz loading (requires jszip)
 * - JSON deserialization for various inline array formats
 *   (see {@link https://github.com/mivanit/muutils}, {@link https://github.com/mivanit/zanj})
 */

// Must match muutils.json_serialize.util._FORMAT_KEY
const _FORMAT_KEY = "__muutils_format__";

// Float16 converter function
function float16ToFloat32(float16) {
	const sign = (float16 >> 15) & 0x1;
	const exponent = (float16 >> 10) & 0x1f;
	const fraction = float16 & 0x3ff;

	if (exponent === 0) {
		if (fraction === 0) {
			return sign ? -0 : 0;
		}
		return (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / 0x400);
	} else if (exponent === 0x1f) {
		if (fraction === 0) {
			return sign ? -Infinity : Infinity;
		}
		return NaN;
	}

	return (
		(sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x400)
	);
}

function float16ToFloat32Array(float16Array) {
	const length = float16Array.length;
	const float32Array = new Float32Array(length);
	for (let i = 0; i < length; i++) {
		float32Array[i] = float16ToFloat32(float16Array[i]);
	}
	return float32Array;
}

function _isBigIntArray(arr) {
	return arr instanceof BigInt64Array || arr instanceof BigUint64Array;
}

// Parse NPY header dict (Python dict literal → JS object)
function _parseNPYHeader(text) {
	return JSON.parse(
		text
			.replace(/True/g, "true")
			.replace(/False/g, "false")
			.replace(/'/g, '"')
			.replace(/\(/g, "[")
			.replace(/,*\),*/g, "]")
			.replace(/,\s*]/g, "]"),
	);
}

// Canonical dtype list - single source of truth
const _DTYPES = [
	{
		descriptors: ["<u1", "|u1"],
		name: "uint8",
		size: 8,
		arrayConstructor: Uint8Array,
		converter: null,
	},
	{
		descriptors: ["<u2"],
		name: "uint16",
		size: 16,
		arrayConstructor: Uint16Array,
		converter: null,
	},
	{
		descriptors: ["<u4"],
		name: "uint32",
		size: 32,
		arrayConstructor: Uint32Array,
		converter: null,
	},
	{
		descriptors: ["<u8"],
		name: "uint64",
		size: 64,
		arrayConstructor: BigUint64Array,
		converter: null,
	},
	{
		descriptors: ["|i1"],
		name: "int8",
		size: 8,
		arrayConstructor: Int8Array,
		converter: null,
	},
	{
		descriptors: ["<i2"],
		name: "int16",
		size: 16,
		arrayConstructor: Int16Array,
		converter: null,
	},
	{
		descriptors: ["<i4"],
		name: "int32",
		size: 32,
		arrayConstructor: Int32Array,
		converter: null,
	},
	{
		descriptors: ["<i8"],
		name: "int64",
		size: 64,
		arrayConstructor: BigInt64Array,
		converter: null,
	},
	{
		descriptors: ["<f4"],
		name: "float32",
		size: 32,
		arrayConstructor: Float32Array,
		converter: null,
	},
	{
		descriptors: ["<f8"],
		name: "float64",
		size: 64,
		arrayConstructor: Float64Array,
		converter: null,
	},
	{
		descriptors: ["<f2"],
		name: "float16",
		size: 16,
		arrayConstructor: Uint16Array,
		converter: float16ToFloat32Array,
	},
];

// Generate map: numpy descriptor -> dtype info (for NPY parsing)
const _DTYPE_BY_DESCRIPTOR = {};
for (const dtype of _DTYPES) {
	for (const desc of dtype.descriptors) {
		_DTYPE_BY_DESCRIPTOR[desc] = dtype;
	}
}

// Generate map: dtype name -> dtype info (for JSON deserialization)
const _DTYPE_BY_NAME = {};
for (const dtype of _DTYPES) {
	_DTYPE_BY_NAME[dtype.name] = dtype;
}

// Generate map: TypedArray constructor -> dtype name (for type inference)
const _CONSTRUCTOR_TO_DTYPE = new Map();
for (const dtype of _DTYPES) {
	_CONSTRUCTOR_TO_DTYPE.set(dtype.arrayConstructor, dtype.name);
}

// NPY header info for range-based loading
class NPYHeaderInfo {
	constructor({ shape, dtype, fortranOrder, dataOffset }) {
		this.shape = shape;
		this.dtype = dtype;
		this.fortranOrder = fortranOrder;
		this.dataOffset = dataOffset;

		// Get element size in bytes from dtype
		const dtypeInfo = _DTYPE_BY_DESCRIPTOR[dtype];
		if (!dtypeInfo) {
			throw new Error(
				`NPYHeaderInfo: unsupported dtype descriptor "${dtype}"`,
			);
		}
		this.elementSize = dtypeInfo.size / 8;

		// Calculate stride for first axis (bytes per first-axis element)
		// For shape [d0, d1, d2], stride = d1 * d2 * elementSize
		this.firstAxisStride =
			this.shape.slice(1).reduce((acc, dim) => acc * dim, 1) *
			this.elementSize;
	}
}

// Fetch only the NPY header using HTTP range requests
async function fetchNPYHeader(url, fetchArgs = {}) {
	// Fetch first 1KB - enough for most headers (typically < 200 bytes)
	const initialResponse = await fetch(url, {
		...fetchArgs,
		headers: {
			...fetchArgs.headers,
			Range: "bytes=0-1023",
		},
	});

	// Check if range requests are supported
	if (initialResponse.status === 200) {
		// Server returned full file - range not supported
		console.warn(
			"HTTP Range requests not supported for",
			url,
			"- downloading full file",
		);
		return { rangeSupported: false, fullResponse: initialResponse };
	}

	if (initialResponse.status !== 206) {
		throw new Error(
			`Failed to fetch NPY header: ${initialResponse.status}`,
		);
	}

	const initialBytes = await initialResponse.arrayBuffer();

	// Reject NPY v2.0+ (uses uint32 header length at different offset)
	const majorVersion = new Uint8Array(initialBytes)[6];
	if (majorVersion > 1) {
		throw new Error(
			`NPY format v${majorVersion}.0 is not supported (only v1.0)`,
		);
	}

	// Parse header length (uint16 little-endian at bytes 8-9 for v1.0)
	const headerLength = new DataView(initialBytes, 8, 2).getUint16(0, true);
	const headerStart = 10;
	const dataOffset = headerStart + headerLength;

	let headerBytes;
	if (dataOffset <= initialBytes.byteLength) {
		// Header fits in initial 1KB fetch - no second request needed
		headerBytes = initialBytes.slice(headerStart, dataOffset);
	} else {
		// Header larger than 1KB (rare) - fetch the rest
		const headerResponse = await fetch(url, {
			...fetchArgs,
			headers: {
				...fetchArgs.headers,
				Range: `bytes=${initialBytes.byteLength}-${dataOffset - 1}`,
			},
		});

		if (headerResponse.status !== 206) {
			throw new Error(
				`Failed to fetch NPY header content: ${headerResponse.status}`,
			);
		}

		// Combine initial bytes with remaining header
		const remainingBytes = await headerResponse.arrayBuffer();
		const combined = new Uint8Array(dataOffset);
		combined.set(new Uint8Array(initialBytes), 0);
		combined.set(new Uint8Array(remainingBytes), initialBytes.byteLength);
		headerBytes = combined.slice(headerStart, dataOffset);
	}

	const headerText = new TextDecoder("utf-8").decode(
		new Uint8Array(headerBytes),
	);

	// Parse header dict
	const header = _parseNPYHeader(headerText);

	if (header.fortran_order) {
		throw new Error(
			"Fortran-order NPY files are not supported. Save with order='C'.",
		);
	}

	return {
		rangeSupported: true,
		info: new NPYHeaderInfo({
			shape: header.shape,
			dtype: header.descr,
			fortranOrder: header.fortran_order,
			dataOffset: dataOffset,
		}),
	};
}

class npyjs {
	constructor(opts) {
		this.convertFloat16 = opts?.convertFloat16 ?? true;
		this.dtypes = {};

		// Build dtypes map from canonical list
		for (const desc in _DTYPE_BY_DESCRIPTOR) {
			const dtype = _DTYPE_BY_DESCRIPTOR[desc];
			this.dtypes[desc] = {
				name: dtype.name,
				size: dtype.size,
				arrayConstructor: dtype.arrayConstructor,
				converter:
					dtype.converter && this.convertFloat16
						? dtype.converter
						: undefined,
			};
		}
	}

	parse(arrayBufferContents) {
		// Reject NPY v2.0+ (uses uint32 header length at different offset)
		const majorVersion = new Uint8Array(arrayBufferContents)[6];
		if (majorVersion > 1) {
			throw new Error(
				`NPY format v${majorVersion}.0 is not supported (only v1.0)`,
			);
		}
		const headerLength = new DataView(
			arrayBufferContents.slice(8, 10),
		).getUint16(0, true);
		const offsetBytes = 10 + headerLength;

		const hcontents = new TextDecoder("utf-8").decode(
			new Uint8Array(arrayBufferContents.slice(10, 10 + headerLength)),
		);
		const header = _parseNPYHeader(hcontents);
		const shape = header.shape;

		if (header.fortran_order) {
			throw new Error(
				"Fortran-order NPY files are not supported. Save with order='C'.",
			);
		}

		const dtype = this.dtypes[header.descr];

		if (!dtype) {
			throw new Error(`Unsupported dtype: ${header.descr}`);
		}

		const nums = new dtype.arrayConstructor(
			arrayBufferContents,
			offsetBytes,
		);

		// Convert float16 to float32 if converter exists
		const data = dtype.converter ? dtype.converter.call(this, nums) : nums;

		return {
			dtype: dtype.name,
			data: data,
			shape,
			fortranOrder: header.fortran_order,
		};
	}

	async load(filename, callback, fetchArgs) {
		/*
		Loads an array from a stream of bytes.
		*/
		fetchArgs = fetchArgs || {};
		let arrayBuf;
		// If filename is ArrayBuffer
		if (filename instanceof ArrayBuffer) {
			arrayBuf = filename;
		}
		// If filename is a file path
		else {
			const resp = await fetch(filename, { ...fetchArgs });
			arrayBuf = await resp.arrayBuffer();
		}
		const result = this.parse(arrayBuf);
		if (callback) {
			return callback(result);
		}
		return result;
	}

	async loadNPZ(filename, fetchArgs) {
		fetchArgs = fetchArgs || {};
		const resp = await fetch(filename, { ...fetchArgs });
		const arrayBuffer = await resp.arrayBuffer();
		return this.parseZIP(arrayBuffer);
	}

	async parseZIP(arrayBuffer) {
		// Use JSZip to properly decompress NPZ files
		const zip = new JSZip();
		const zipFile = await zip.loadAsync(arrayBuffer);
		const arrays = {};

		// Iterate through all files in the ZIP
		for (const [filename, file] of Object.entries(zipFile.files)) {
			if (file.dir) continue;

			// Get decompressed ArrayBuffer
			const decompressedData = await file.async("arraybuffer");

			// Parse NPY data
			const arrayName = filename.replace(".npy", "");
			arrays[arrayName] = this.parse(decompressedData);
		}

		return arrays;
	}
}

class NDArray {
	/**
	 * Creates a multidimensional array similar to NumPy arrays
	 *
	 * @param {any} data - The array data
	 * @param {Array<number>} shape - The shape of the array
	 * @param {string} dtype - The data type of the array
	 */
	constructor(data, shape, dtype) {
		this.data = data;
		this.shape = shape;
		this.dtype = dtype;
		this.ndim = shape.length;

		// Calculate total size from shape
		this._size = shape.reduce((acc, dim) => acc * dim, 1);

		// Validate data length matches shape
		if (data.length !== this._size) {
			throw new Error(
				`Data length ${data.length} doesn't match shape ${shape} (expected ${this._size})`,
			);
		}
	}

	/**
	 * Returns the total number of elements in the array
	 * @returns {number} Total number of elements
	 */
	get size() {
		return this._size;
	}

	/**
	 * Validates axis parameter is within bounds
	 * @param {number|null} axis - The axis to validate
	 * @returns {number|null} The validated axis
	 * @private
	 */
	_validateAxis(axis) {
		if (axis === null || axis === undefined) {
			return null;
		}

		// Handle negative axis
		if (axis < 0) {
			axis = this.ndim + axis;
		}

		if (axis < 0 || axis >= this.ndim) {
			throw new Error(
				`axis ${axis} is out of bounds for array with ${this.ndim} dimensions`,
			);
		}

		return axis;
	}

	/**
	 * Returns a flattened 1D view of the array
	 * @returns {NDArray} 1D NDArray
	 */
	flatten() {
		return new this.constructor(this.data, [this._size], this.dtype);
	}

	/**
	 * Slice the array along the first axis.
	 * Returns a new NDArray containing elements [start, end) along the first axis.
	 *
	 * @param {Array<number>|number} range - [start, end) range or single index for first axis
	 * @returns {NDArray} Sliced array
	 *
	 * @example
	 * const arr = new NDArray(data, [100, 10], 'float32');
	 * const sliced = arr.slice([10, 20]); // shape: [10, 10]
	 * const row = arr.slice(5);           // shape: [1, 10] - single row
	 */
	slice(range) {
		// Allow single int to get one row
		const dim0 = this.shape[0];
		let start, end;
		if (typeof range === "number") {
			start = range < 0 ? dim0 + range : range;
			end = start + 1;
		} else {
			[start, end] = range;
			if (start < 0) start = dim0 + start;
			if (end < 0) end = dim0 + end;
		}

		// Validate bounds
		if (start < 0 || end > dim0 || start > end) {
			throw new Error(
				`Invalid slice [${start}, ${end}) for array with shape ${this.shape}`,
			);
		}

		// Calculate stride for first axis (elements per first-axis index)
		const firstAxisStride = this.shape
			.slice(1)
			.reduce((acc, dim) => acc * dim, 1);

		// Extract slice data
		const sliceStart = start * firstAxisStride;
		const sliceEnd = end * firstAxisStride;
		const slicedData = this.data.slice(sliceStart, sliceEnd);

		// Construct sliced shape
		const slicedShape = [end - start, ...this.shape.slice(1)];

		return new this.constructor(slicedData, slicedShape, this.dtype);
	}

	/**
	 * Computes the sum of array elements over a given axis
	 * @param {number|null} axis - Axis along which to sum. If null, sum over all elements
	 * @returns {number|NDArray} Sum as scalar or NDArray depending on axis
	 */
	sum(axis = null) {
		axis = this._validateAxis(axis);

		// Sum over all elements
		if (axis === null) {
			if (this._size === 0) return _isBigIntArray(this.data) ? 0n : 0;
			let total = this.data[0];
			for (let i = 1; i < this._size; i++) {
				total += this.data[i];
			}
			return total;
		}

		// Sum along specific axis
		const newShape = this.shape.filter((_, i) => i !== axis);
		const newSize = newShape.reduce((acc, dim) => acc * dim, 1);
		const resultData = new this.data.constructor(newSize);

		// Calculate strides for indexing
		const strides = new Array(this.ndim);
		strides[this.ndim - 1] = 1;
		for (let i = this.ndim - 2; i >= 0; i--) {
			strides[i] = strides[i + 1] * this.shape[i + 1];
		}

		// Sum values along the specified axis
		for (let i = 0; i < this._size; i++) {
			// Convert flat index to multidimensional indices
			let remaining = i;
			const indices = new Array(this.ndim);
			for (let j = 0; j < this.ndim; j++) {
				indices[j] = Math.floor(remaining / strides[j]);
				remaining %= strides[j];
			}

			// Calculate result index (excluding the axis dimension)
			let resultIdx = 0;
			let resultStride = 1;
			for (let j = this.ndim - 1; j >= 0; j--) {
				if (j !== axis) {
					resultIdx += indices[j] * resultStride;
					resultStride *= this.shape[j];
				}
			}

			resultData[resultIdx] += this.data[i];
		}

		return new this.constructor(resultData, newShape, this.dtype);
	}

	/**
	 * Computes the mean of array elements over a given axis
	 * @param {number|null} axis - Axis along which to compute mean. If null, compute mean over all elements
	 * @returns {number|NDArray} Mean as scalar or NDArray depending on axis
	 */
	mean(axis = null) {
		axis = this._validateAxis(axis);

		// Mean over all elements
		if (axis === null) {
			if (this._size === 0) {
				throw new Error("mean of empty slice is undefined");
			}
			const total = this.sum(null);
			return Number(total) / this._size;
		}

		// Mean along specific axis
		const sumResult = this.sum(axis);
		if (this.shape[axis] === 0) {
			throw new Error("mean of empty slice is undefined");
		}
		const divisor = this.shape[axis];
		const isBigInt = _isBigIntArray(sumResult.data);

		// Always return float for mean (convert BigInt sums to Number)
		const resultData = isBigInt
			? new Float64Array(sumResult.data.length)
			: new sumResult.data.constructor(sumResult.data.length);
		for (let i = 0; i < sumResult.data.length; i++) {
			resultData[i] =
				(isBigInt ? Number(sumResult.data[i]) : sumResult.data[i]) /
				divisor;
		}

		return new this.constructor(
			resultData,
			sumResult.shape,
			isBigInt ? "float64" : this.dtype,
		);
	}

	/**
	 * Computes both minimum and maximum of array elements over a given axis in a single pass
	 * @param {number|null} axis - Axis along which to find range. If null, find range over all elements
	 * @returns {NDArray} NDArray with shape [..., 2] where index 0 is min, index 1 is max
	 */
	range(axis = null) {
		axis = this._validateAxis(axis);

		// Range over all elements - return [2] array
		if (axis === null) {
			if (this._size === 0) {
				throw new Error(
					"zero-size array to reduction operation range which has no identity",
				);
			}
			let minVal = this.data[0];
			let maxVal = this.data[0];
			for (let i = 1; i < this._size; i++) {
				if (this.data[i] < minVal) {
					minVal = this.data[i];
				}
				if (this.data[i] > maxVal) {
					maxVal = this.data[i];
				}
			}
			const resultData = new this.data.constructor(2);
			resultData[0] = minVal;
			resultData[1] = maxVal;
			return new this.constructor(resultData, [2], this.dtype);
		}

		// Range along specific axis - result shape is [..., 2]
		if (this.shape[axis] === 0) {
			throw new Error(
				"zero-size array to reduction operation range which has no identity",
			);
		}
		const baseShape = this.shape.filter((_, i) => i !== axis);
		const newShape = [...baseShape, 2];
		const baseSize = baseShape.reduce((acc, dim) => acc * dim, 1);
		const newSize = baseSize * 2;
		const resultData = new this.data.constructor(newSize);

		// Calculate strides for indexing
		const strides = new Array(this.ndim);
		strides[this.ndim - 1] = 1;
		for (let i = this.ndim - 2; i >= 0; i--) {
			strides[i] = strides[i + 1] * this.shape[i + 1];
		}

		// Track whether each position has been initialized
		const initialized = new Uint8Array(baseSize);

		// Find min and max values along the specified axis
		for (let i = 0; i < this._size; i++) {
			// Convert flat index to multidimensional indices
			let remaining = i;
			const indices = new Array(this.ndim);
			for (let j = 0; j < this.ndim; j++) {
				indices[j] = Math.floor(remaining / strides[j]);
				remaining %= strides[j];
			}

			// Calculate result index (excluding the axis dimension)
			let resultIdx = 0;
			let resultStride = 1;
			for (let j = this.ndim - 1; j >= 0; j--) {
				if (j !== axis) {
					resultIdx += indices[j] * resultStride;
					resultStride *= this.shape[j];
				}
			}

			// Seed with first value, then compare
			if (!initialized[resultIdx]) {
				resultData[resultIdx * 2] = this.data[i];
				resultData[resultIdx * 2 + 1] = this.data[i];
				initialized[resultIdx] = 1;
			} else {
				if (this.data[i] < resultData[resultIdx * 2]) {
					resultData[resultIdx * 2] = this.data[i];
				}
				if (this.data[i] > resultData[resultIdx * 2 + 1]) {
					resultData[resultIdx * 2 + 1] = this.data[i];
				}
			}
		}

		return new this.constructor(resultData, newShape, this.dtype);
	}

	/**
	 * Computes the minimum of array elements over a given axis
	 * @param {number|null} axis - Axis along which to find minimum. If null, find minimum over all elements
	 * @returns {number|NDArray} Minimum as scalar or NDArray depending on axis
	 */
	min(axis = null) {
		axis = this._validateAxis(axis);
		const rangeResult = this.range(axis);

		if (axis === null) {
			return rangeResult.data[0];
		}

		const baseSize = rangeResult.data.length / 2;
		const minData = new this.data.constructor(baseSize);
		for (let i = 0; i < baseSize; i++) {
			minData[i] = rangeResult.data[i * 2];
		}

		const newShape = this.shape.filter((_, i) => i !== axis);
		return new this.constructor(minData, newShape, this.dtype);
	}

	/**
	 * Computes the maximum of array elements over a given axis
	 * @param {number|null} axis - Axis along which to find maximum. If null, find maximum over all elements
	 * @returns {number|NDArray} Maximum as scalar or NDArray depending on axis
	 */
	max(axis = null) {
		axis = this._validateAxis(axis);
		const rangeResult = this.range(axis);

		if (axis === null) {
			return rangeResult.data[1];
		}

		const baseSize = rangeResult.data.length / 2;
		const maxData = new this.data.constructor(baseSize);
		for (let i = 0; i < baseSize; i++) {
			maxData[i] = rangeResult.data[i * 2 + 1];
		}

		const newShape = this.shape.filter((_, i) => i !== axis);
		return new this.constructor(maxData, newShape, this.dtype);
	}

	/**
	 * Returns a new array with a new shape
	 * @param {Array<number>} newShape - The new shape, can contain -1 for auto-calculation
	 * @returns {NDArray} Reshaped array
	 */
	reshape(newShape) {
		if (!Array.isArray(newShape)) {
			throw new Error("newShape must be an array");
		}

		// Reject invalid negative dimensions (only -1 is allowed)
		for (const dim of newShape) {
			if (dim < -1) {
				throw new Error(
					`invalid dimension ${dim} in reshape (only -1 is allowed for auto-calculation)`,
				);
			}
		}

		// Handle -1 for auto-calculation
		const autoIdx = newShape.indexOf(-1);
		let finalShape = [...newShape];

		if (autoIdx !== -1) {
			// Check for multiple -1s
			if (newShape.indexOf(-1, autoIdx + 1) !== -1) {
				throw new Error("can only specify one unknown dimension (-1)");
			}

			// Calculate the auto dimension
			const knownSize = newShape.reduce(
				(acc, dim) => (dim === -1 ? acc : acc * dim),
				1,
			);
			if (knownSize === 0) {
				finalShape[autoIdx] = 0;
			} else {
				if (this._size % knownSize !== 0) {
					throw new Error(
						`cannot reshape array of size ${this._size} into shape ${newShape}`,
					);
				}
				finalShape[autoIdx] = this._size / knownSize;
			}
		}

		// Validate new shape has same total size
		const newSize = finalShape.reduce((acc, dim) => acc * dim, 1);
		if (newSize !== this._size) {
			throw new Error(
				`cannot reshape array of size ${this._size} into shape ${finalShape} (size ${newSize})`,
			);
		}

		// Create new array with same data but different shape
		return new this.constructor(this.data, finalShape, this.dtype);
	}

	/**
	 * Returns a transposed array
	 * @param {Array<number>|null} axes - Permutation of axes. If null, reverses all axes
	 * @returns {NDArray} Transposed array
	 */
	transpose(axes = null) {
		// Default: reverse all axes
		if (axes === null) {
			axes = Array.from(
				{ length: this.ndim },
				(_, i) => this.ndim - 1 - i,
			);
		}

		// Validate axes
		if (!Array.isArray(axes) || axes.length !== this.ndim) {
			throw new Error(`axes must be array of length ${this.ndim}`);
		}

		// Normalize negative axes
		axes = axes.map((ax) => (ax < 0 ? ax + this.ndim : ax));

		// Check for valid permutation (all unique, in range)
		const axesSet = new Set(axes);
		if (axesSet.size !== this.ndim) {
			throw new Error("axes must be a permutation of dimensions");
		}
		for (const axis of axes) {
			if (axis < 0 || axis >= this.ndim) {
				throw new Error(
					`axis ${axis} is out of bounds for array with ${this.ndim} dimensions`,
				);
			}
		}

		// Calculate new shape
		const newShape = axes.map((ax) => this.shape[ax]);

		// Calculate old strides
		const oldStrides = new Array(this.ndim);
		oldStrides[this.ndim - 1] = 1;
		for (let i = this.ndim - 2; i >= 0; i--) {
			oldStrides[i] = oldStrides[i + 1] * this.shape[i + 1];
		}

		// Create new data array
		const newData = new this.data.constructor(this._size);

		// Calculate new strides
		const newStrides = new Array(this.ndim);
		newStrides[this.ndim - 1] = 1;
		for (let i = this.ndim - 2; i >= 0; i--) {
			newStrides[i] = newStrides[i + 1] * newShape[i + 1];
		}

		// Copy data in transposed order
		for (let i = 0; i < this._size; i++) {
			// Convert flat index to old multidimensional indices
			let remaining = i;
			const oldIndices = new Array(this.ndim);
			for (let j = 0; j < this.ndim; j++) {
				oldIndices[j] = Math.floor(remaining / oldStrides[j]);
				remaining %= oldStrides[j];
			}

			// Permute indices according to axes
			const newIndices = new Array(this.ndim);
			for (let j = 0; j < this.ndim; j++) {
				newIndices[j] = oldIndices[axes[j]];
			}

			// Convert new multidimensional indices to flat index
			let newFlatIdx = 0;
			for (let j = 0; j < this.ndim; j++) {
				newFlatIdx += newIndices[j] * newStrides[j];
			}

			newData[newFlatIdx] = this.data[i];
		}

		return new this.constructor(newData, newShape, this.dtype);
	}

	/**
	 * Converts multidimensional indices to flat index
	 *
	 * @param {Array<number|null>} indices - Array of indices, can contain null for slicing
	 * @returns {number|Array<number>} - Flat index or array of indices for slicing
	 * @private
	 */
	_getIndices(indices) {
		// Clone to avoid mutating caller's array
		indices = [...indices];

		// Handle case where all dimensions are requested (no indices)
		if (indices.length === 0) {
			return [...Array(this._size).keys()];
		}

		// Check that we don't have too many indices
		if (indices.filter((idx) => idx !== null).length > this.shape.length) {
			throw new Error(
				`Too many indices for array with shape ${this.shape}`,
			);
		}

		// If we have exact indices (no nulls), calculate flat index
		if (!indices.includes(null) && indices.length === this.shape.length) {
			// Validate all indices
			for (let i = 0; i < indices.length; i++) {
				if (indices[i] < 0) {
					indices[i] = this.shape[i] + indices[i]; // Handle negative indices like numpy
				}

				if (indices[i] < 0 || indices[i] >= this.shape[i]) {
					throw new Error(
						`Index ${indices[i]} is out of bounds for axis ${i} with size ${this.shape[i]}`,
					);
				}
			}

			// Calculate flat index using strides
			let flatIndex = 0;
			let stride = 1;

			for (let i = this.shape.length - 1; i >= 0; i--) {
				flatIndex += indices[i] * stride;
				stride *= this.shape[i];
			}

			return flatIndex;
		}

		// Handle slicing (when some indices are null)
		// This returns all flat indices that match the specified dimensions
		const resultIndices = [];
		const completeIndices = [...indices];

		// Fill in missing indices with zeros
		while (completeIndices.length < this.shape.length) {
			completeIndices.push(0);
		}

		// Find which dimensions need to be iterated over (those with null)
		const dimToIterate = [];
		for (let i = 0; i < this.shape.length; i++) {
			if (i >= indices.length || indices[i] === null) {
				dimToIterate.push(i);
			}
		}

		// Generate all combinations of indices for the dimensions to iterate over
		const generateIndices = (currentDim, currentIndices) => {
			if (currentDim >= dimToIterate.length) {
				// Calculate flat index for this combination
				let flatIndex = 0;
				let stride = 1;

				for (let i = this.shape.length - 1; i >= 0; i--) {
					flatIndex += currentIndices[i] * stride;
					stride *= this.shape[i];
				}

				resultIndices.push(flatIndex);
				return;
			}

			const dim = dimToIterate[currentDim];
			for (let i = 0; i < this.shape[dim]; i++) {
				currentIndices[dim] = i;
				generateIndices(currentDim + 1, currentIndices);
			}
		};

		generateIndices(0, completeIndices);
		return resultIndices;
	}

	/**
	 * Gets values at specified indices
	 *
	 * @param {...(number|null)} args - Indices for each dimension, null for full dimension
	 * @returns {any} - Value or subarray at the specified location
	 */
	get(...args) {
		// Handle case where args is array
		let indices = args;
		if (args.length === 1 && Array.isArray(args[0])) {
			indices = args[0];
		}

		const flatIndices = this._getIndices(indices);

		// If we got a single index, return the single value
		if (typeof flatIndices === "number") {
			return this.data[flatIndices];
		}

		// Otherwise, create a new array with the values
		// We need to calculate the shape of the result
		const resultShape = [];
		for (let i = 0; i < this.shape.length; i++) {
			if (i >= indices.length || indices[i] === null) {
				resultShape.push(this.shape[i]);
			}
		}

		// If result is empty, it means we want the entire array
		if (resultShape.length === 0) {
			return this;
		}

		// Create new data array with the values at the flat indices
		const resultData = new this.data.constructor(flatIndices.length);
		for (let i = 0; i < flatIndices.length; i++) {
			resultData[i] = this.data[flatIndices[i]];
		}

		return new this.constructor(resultData, resultShape, this.dtype);
	}

	/**
	 * Sets values at specified indices
	 *
	 * @param {...*} args - Indices followed by value to set
	 */
	set(...args) {
		// Handle case where args is array
		let indices, value;
		if (args.length === 2 && Array.isArray(args[0])) {
			indices = args[0];
			value = args[1];
		} else {
			value = args[args.length - 1];
			indices = args.slice(0, args.length - 1);
		}

		const flatIndices = this._getIndices(indices);

		// If we got a single index, set the single value
		if (typeof flatIndices === "number") {
			this.data[flatIndices] = value;
			return;
		}

		// Otherwise, set all indices to the value
		// If value is an array, distribute its values
		if (
			Array.isArray(value) ||
			ArrayBuffer.isView(value) ||
			value instanceof NDArray
		) {
			const valueArray = value instanceof NDArray ? value.data : value;
			if (valueArray.length !== flatIndices.length) {
				throw new Error(
					`Cannot broadcast ${valueArray.length} values to ${flatIndices.length} indices`,
				);
			}

			for (let i = 0; i < flatIndices.length; i++) {
				this.data[flatIndices[i]] = valueArray[i];
			}
		} else {
			// Set all indices to the same value
			for (const idx of flatIndices) {
				this.data[idx] = value;
			}
		}
	}

	/**
	 * Slice along an arbitrary dimension: extract [start, end) along the given axis.
	 * Returns a new contiguous NDArray.
	 *
	 * @param {number} dim - Axis to slice along (supports negative indexing)
	 * @param {number} start - Start index (inclusive)
	 * @param {number} end - End index (exclusive)
	 * @returns {NDArray} Sliced array
	 *
	 * @example
	 * const arr = new NDArray(data, [2, 3, 4], 'float32');
	 * const sliced = arr.sliceDim(1, 0, 2); // shape: [2, 2, 4]
	 */
	sliceDim(dim, start, end) {
		const shape = this.shape;
		const rank = shape.length;

		// Handle negative dim
		if (dim < 0) dim = rank + dim;

		if (dim < 0 || dim >= rank) {
			throw new Error(
				`dim ${dim} is out of bounds for array with ${rank} dimensions`,
			);
		}
		// Handle negative start/end
		if (start < 0) start = shape[dim] + start;
		if (end < 0) end = shape[dim] + end;

		if (start < 0 || end > shape[dim] || start > end) {
			throw new Error(
				`Invalid slice [${start}, ${end}) for axis ${dim} with size ${shape[dim]}`,
			);
		}

		const newShape = [...shape];
		newShape[dim] = end - start;

		const outerSize = shape.slice(0, dim).reduce((a, b) => a * b, 1);
		const innerSize = shape.slice(dim + 1).reduce((a, b) => a * b, 1);
		const dimSize = shape[dim];
		const sliceSize = (end - start) * innerSize;

		const out = new this.data.constructor(
			newShape.reduce((a, b) => a * b, 1),
		);

		for (let outer = 0; outer < outerSize; outer++) {
			for (let d = start; d < end; d++) {
				const srcOff = (outer * dimSize + d) * innerSize;
				const dstOff = outer * sliceSize + (d - start) * innerSize;
				for (let inner = 0; inner < innerSize; inner++) {
					out[dstOff + inner] = this.data[srcOff + inner];
				}
			}
		}

		return new this.constructor(out, newShape, this.dtype);
	}

	/**
	 * Convert to a Tensor instance (requires tensor.js to be loaded).
	 * If dtype is already float32, shares the underlying data buffer.
	 *
	 * @param {string} [dtype='float32'] - Target dtype for the Tensor
	 * @returns {Tensor} Tensor instance
	 * @throws {ReferenceError} If tensor.js is not loaded
	 */
	toTensor(dtype = "float32") {
		if (typeof Tensor === "undefined") {
			throw new ReferenceError(
				"Tensor class not found — load tensor.js after array.js",
			);
		}
		if (!_DTYPE_BY_NAME[dtype]) {
			throw new Error(`Unsupported dtype: ${dtype}`);
		}
		let data;
		if (this.dtype === dtype) {
			data = this.data;
		} else {
			// If source has a converter (e.g. float16 → Uint16Array), decode first
			const srcInfo = _DTYPE_BY_NAME[this.dtype];
			const rawData =
				srcInfo && srcInfo.converter
					? srcInfo.converter(this.data)
					: this.data;
			data = new _DTYPE_BY_NAME[dtype].arrayConstructor(rawData);
		}
		return new Tensor(data, [...this.shape], dtype);
	}

	/**
	 * Create an NDArray from a Tensor or plain tensor object {data, shape}.
	 *
	 * @param {Object} t - Tensor instance or plain object with data and shape properties
	 * @param {string} [dtype] - Override dtype (auto-detected from data if omitted)
	 * @returns {NDArray} NDArray instance
	 */
	static fromTensor(t, dtype) {
		if (!t || !t.data || !t.shape) {
			throw new Error("Expected object with data and shape properties");
		}
		const inferredDtype =
			dtype ||
			(t instanceof NDArray
				? t.dtype
				: _CONSTRUCTOR_TO_DTYPE.get(t.data.constructor) || "float32");
		return new NDArray(t.data, [...t.shape], inferredDtype);
	}

	/**
	 * Returns a string representation of the array
	 *
	 * @returns {string} String representation of the array
	 */
	toString() {
		// Simple representation for 1D arrays
		if (this.shape.length === 1) {
			return `[${Array.from(this.data).join(", ")}]`;
		}

		// For higher dimensions, we'll just show shape and type
		return `NDArray(${this.shape.join("X")}, ${this.dtype})`;
	}

	static parse(arrayBufferContents) {
		const npy = new npyjs();
		const npyData = npy.parse(arrayBufferContents);
		if (!npyData) {
			throw new Error("Failed to parse NPY data");
		}
		// Convert data to NDArray
		return new NDArray(npyData.data, npyData.shape, npyData.dtype);
	}

	static async load(filename, callback, fetchArgs) {
		if (filename.endsWith(".npz")) {
			throw new Error(
				"NDArray.load() does not support .npz files. Use NDArray.loadNPZ() instead.",
			);
		}
		const npy = new npyjs({ convertFloat16: true });
		const npyData = await npy.load(filename, null, fetchArgs);
		if (!npyData) {
			throw new Error("Failed to load NPY data");
		}
		return new NDArray(npyData.data, npyData.shape, npyData.dtype);
	}

	/**
	 * Load an NPZ file and return a dict of NDArrays keyed by array name.
	 * Requires JSZip to be loaded globally.
	 *
	 * @param {string} filename - URL or path to the NPZ file
	 * @param {Object} [fetchArgs] - Additional fetch arguments
	 * @returns {Promise<Object<string, NDArray>>} - Dict of NDArrays
	 */
	static async loadNPZ(filename, fetchArgs) {
		const npy = new npyjs({ convertFloat16: true });
		const arrays = await npy.loadNPZ(filename, fetchArgs);
		const result = {};
		for (const [name, npyData] of Object.entries(arrays)) {
			result[name] = new NDArray(
				npyData.data,
				npyData.shape,
				npyData.dtype,
			);
		}
		return result;
	}

	/**
	 * Load a slice of an NPY array using HTTP range requests.
	 * Only first-axis slicing is supported (contiguous bytes).
	 *
	 * @param {string} url - URL to the NPY file
	 * @param {Array<number>|number} slice - [start, end) range or single index for first axis
	 * @param {Object} [fetchArgs] - Additional fetch arguments
	 * @returns {Promise<NDArray>} - Sliced array
	 *
	 * @example
	 * // Load rows 100-199 of a 2D array
	 * const slice = await NDArray.loadSlice(url, [100, 200]);
	 * // Load single row
	 * const row = await NDArray.loadSlice(url, 50);
	 */
	static async loadSlice(url, slice, fetchArgs = {}) {
		// NPZ files are compressed archives - can't use range requests
		if (url.endsWith(".npz")) {
			throw new Error(
				"loadSlice does not support NPZ files (compressed archives)",
			);
		}

		// Allow single int to get one row
		const [start, end] =
			typeof slice === "number" ? [slice, slice + 1] : slice;

		// Fetch header to get array metadata
		const headerResult = await fetchNPYHeader(url, fetchArgs);

		if (!headerResult.rangeSupported) {
			// Fall back to full download
			const fullBuffer = await headerResult.fullResponse.arrayBuffer();
			const fullArray = NDArray.parse(fullBuffer);
			return fullArray.slice(slice);
		}

		const { info } = headerResult;

		// Validate slice bounds
		if (start < 0 || end > info.shape[0] || start > end) {
			throw new Error(
				`Invalid slice [${start}, ${end}) for array with shape ${info.shape}`,
			);
		}

		// Empty slice — return immediately without HTTP fetch
		if (start === end) {
			const slicedShape = [0, ...info.shape.slice(1)];
			const dtypeInfo = _DTYPE_BY_DESCRIPTOR[info.dtype];
			return new NDArray(
				new dtypeInfo.arrayConstructor(0),
				slicedShape,
				dtypeInfo.name,
			);
		}

		// Calculate byte range for the slice
		const byteStart = info.dataOffset + start * info.firstAxisStride;
		const byteEnd = info.dataOffset + end * info.firstAxisStride - 1;

		// Fetch the slice data
		const dataResponse = await fetch(url, {
			...fetchArgs,
			headers: {
				...fetchArgs.headers,
				Range: `bytes=${byteStart}-${byteEnd}`,
			},
		});

		if (dataResponse.status !== 206) {
			// Range request failed, fall back to full download
			console.warn(
				"Range request for data failed, downloading full file",
			);
			const fullArray = await NDArray.load(url, null, fetchArgs);
			return fullArray.slice(slice);
		}

		const dataBuffer = await dataResponse.arrayBuffer();

		// Create typed array from the data
		const dtypeInfo = _DTYPE_BY_DESCRIPTOR[info.dtype];
		if (!dtypeInfo) {
			throw new Error(`Unsupported dtype: ${info.dtype}`);
		}

		const nums = new dtypeInfo.arrayConstructor(dataBuffer);
		const data = dtypeInfo.converter ? dtypeInfo.converter(nums) : nums;

		// Construct sliced shape
		const slicedShape = [end - start, ...info.shape.slice(1)];

		return new NDArray(data, slicedShape, dtypeInfo.name);
	}

	/**
	 * Infer the array format from a JSON object
	 * @param {Object} obj - JSON object potentially containing array data
	 * @returns {string|null} - Format name or null if not an array format
	 */
	static inferFormat(obj) {
		if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
			if (Array.isArray(obj)) return "list";
			return null;
		}

		const fmt = obj[_FORMAT_KEY];
		if (!fmt || typeof fmt !== "string") return null;

		// Format is like "numpy.ndarray:array_b64_meta" or "torch.Tensor:array_list_meta"
		if (fmt.includes(":")) {
			const suffix = fmt.split(":")[1];
			if (
				[
					"array_list_meta",
					"array_hex_meta",
					"array_b64_meta",
					"zero_dim",
				].includes(suffix)
			) {
				return suffix;
			}
		}

		return null;
	}

	/**
	 * Deserialize an NDArray from JSON in various formats
	 * @param {Object} obj - JSON object containing array data
	 * @param {string} [format] - Optional format override (auto-detected if not provided)
	 * @returns {NDArray} - Deserialized NDArray
	 */
	static fromJSON(obj, format = null) {
		// Auto-detect format if not provided
		if (!format) {
			format = NDArray.inferFormat(obj);
			if (!format) {
				throw new Error("Cannot infer array format from object");
			}
		}

		// Handle plain list
		if (format === "list") {
			if (!Array.isArray(obj)) {
				throw new Error("Expected array for list format");
			}
			// Convert nested list to flat TypedArray
			const flatList = obj.flat(Infinity);
			const data = new Float64Array(flatList);
			// Infer shape by walking first elements at each nesting level
			const shape = [];
			let current = obj;
			while (Array.isArray(current)) {
				shape.push(current.length);
				current = current[0];
			}
			// Validate shape matches flat data (catches jagged arrays)
			const expectedSize = shape.reduce((a, b) => a * b, 1);
			if (flatList.length !== expectedSize) {
				throw new Error(
					`Jagged array: flat length ${flatList.length} does not match shape [${shape}] (expected ${expectedSize})`,
				);
			}
			return new NDArray(data, shape, "float64");
		}

		// All other formats have metadata
		if (!obj.shape || !obj.dtype) {
			throw new Error(`Missing shape or dtype for format ${format}`);
		}

		const shape = obj.shape;
		const dtypeName = obj.dtype;
		const dtypeInfo = _DTYPE_BY_NAME[dtypeName];

		if (!dtypeInfo) {
			throw new Error(`Unsupported dtype: ${dtypeName}`);
		}

		// Handle zero-dimensional arrays
		if (format === "zero_dim") {
			let dataValue = obj.data;
			// Convert to BigInt for 64-bit integer types
			if (dtypeName === "int64" || dtypeName === "uint64") {
				dataValue = BigInt(dataValue);
			}
			const data = new dtypeInfo.arrayConstructor([dataValue]);
			return new NDArray(data, shape, dtypeName);
		}

		// Handle array_list_meta
		if (format === "array_list_meta") {
			const flatList = obj.data.flat(Infinity);
			const expectedSize = shape.reduce((a, b) => a * b, 1);
			if (flatList.length !== expectedSize) {
				throw new Error(
					`Jagged array in ${format}: flat length ${flatList.length} does not match shape [${shape}] (expected ${expectedSize})`,
				);
			}
			// Convert to BigInt for 64-bit integer types
			const processedList =
				dtypeName === "int64" || dtypeName === "uint64"
					? flatList.map((v) => BigInt(v))
					: flatList;
			const data = new dtypeInfo.arrayConstructor(processedList);
			if (dtypeInfo.converter) {
				const converted = dtypeInfo.converter(data);
				return new NDArray(converted, shape, dtypeName);
			}
			return new NDArray(data, shape, dtypeName);
		}

		// Handle array_hex_meta
		if (format === "array_hex_meta") {
			const hexString = obj.data;
			if (
				!hexString ||
				typeof hexString !== "string" ||
				hexString.length % 2 !== 0
			) {
				throw new Error(
					`Invalid hex string: must be non-empty with even length`,
				);
			}
			const bytes = new Uint8Array(
				hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)),
			);
			const expectedBytes =
				shape.reduce((a, b) => a * b, 1) * (dtypeInfo.size / 8);
			if (bytes.length !== expectedBytes) {
				throw new Error(
					`Hex data size ${bytes.length} does not match shape [${shape}] with dtype ${dtypeName} (expected ${expectedBytes} bytes)`,
				);
			}
			const data = new dtypeInfo.arrayConstructor(bytes.buffer);
			if (dtypeInfo.converter) {
				const converted = dtypeInfo.converter(data);
				return new NDArray(converted, shape, dtypeName);
			}
			return new NDArray(data, shape, dtypeName);
		}

		// Handle array_b64_meta
		if (format === "array_b64_meta") {
			const b64String = obj.data;
			const binaryString = atob(b64String);
			const expectedBytes =
				shape.reduce((a, b) => a * b, 1) * (dtypeInfo.size / 8);
			if (binaryString.length !== expectedBytes) {
				throw new Error(
					`Base64 decoded to ${binaryString.length} bytes but shape [${shape}] with dtype ${dtypeName} expects ${expectedBytes} bytes`,
				);
			}
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const data = new dtypeInfo.arrayConstructor(bytes.buffer);
			if (dtypeInfo.converter) {
				const converted = dtypeInfo.converter(data);
				return new NDArray(converted, shape, dtypeName);
			}
			return new NDArray(data, shape, dtypeName);
		}

		throw new Error(`Unsupported array format: ${format}`);
	}
}
