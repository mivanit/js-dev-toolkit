/**
 * @fileoverview Tensor class for ML/transformer inference, extending NDArray.
 * @module tensor
 * @version 0.2.0
 * @license GPLv3
 * @see {@link https://github.com/mivanit/js-dev-toolkit}
 *
 * @requires module:array — array.js MUST be loaded before this file.
 * Tensor extends NDArray and inherits all of its methods (sum, mean, reshape,
 * transpose, slice, get, set, min, max, flatten, etc.)
 */

class Tensor extends NDArray {
	/**
	 * Create a Tensor. Defaults to float32 dtype.
	 *
	 * @param {Float32Array|Array|TypedArray} data - The array data
	 * @param {Array<number>} shape - The shape of the array
	 * @param {string} [dtype='float32'] - Data type (default: 'float32')
	 */
	constructor(data, shape, dtype = "float32") {
		// Auto-convert plain arrays to appropriate TypedArray
		if (Array.isArray(data)) {
			const dtypeInfo = _DTYPE_BY_NAME[dtype];
			if (!dtypeInfo) {
				throw new Error(`Unsupported dtype: ${dtype}`);
			}
			data = new dtypeInfo.arrayConstructor(data);
		}
		super(data, shape, dtype);
	}

	/**
	 * Create a tensor of zeros.
	 *
	 * @param {Array<number>} shape - Shape of the tensor
	 * @param {string} [dtype='float32'] - Data type
	 * @returns {Tensor}
	 */
	static zeros(shape, dtype = "float32") {
		const dtypeInfo = _DTYPE_BY_NAME[dtype];
		if (!dtypeInfo) {
			throw new Error(`Unsupported dtype: ${dtype}`);
		}
		const size = shape.reduce((a, b) => a * b, 1);
		return new Tensor(
			new dtypeInfo.arrayConstructor(size),
			[...shape],
			dtype,
		);
	}

	/**
	 * Element-wise add. Supports broadcasting b (1D) over last dim of this.
	 *
	 * @param {Tensor|NDArray} other - Tensor to add
	 * @returns {Tensor}
	 */
	add(other) {
		if (
			other.shape.length === 1 &&
			other.shape[0] === this.shape[this.shape.length - 1]
		) {
			// broadcast bias over last dimension
			const out = new this.data.constructor(this.data.length);
			const D = other.shape[0];
			for (let i = 0; i < this.data.length; i++) {
				out[i] = this.data[i] + other.data[i % D];
			}
			return new Tensor(out, [...this.shape], this.dtype);
		}
		// same shape
		if (
			this.shape.length !== other.shape.length ||
			!this.shape.every((d, i) => d === other.shape[i])
		) {
			throw new Error(
				`add shape mismatch: [${this.shape}] vs [${other.shape}]`,
			);
		}
		const out = new this.data.constructor(this.data.length);
		for (let i = 0; i < this.data.length; i++) {
			out[i] = this.data[i] + other.data[i];
		}
		return new Tensor(out, [...this.shape], this.dtype);
	}

	/**
	 * Scale all elements by a scalar.
	 *
	 * @param {number} s - Scalar multiplier
	 * @returns {Tensor}
	 */
	scale(s) {
		const out = new this.data.constructor(this.data.length);
		for (let i = 0; i < this.data.length; i++) {
			out[i] = this.data[i] * s;
		}
		return new Tensor(out, [...this.shape], this.dtype);
	}

	/**
	 * 2D matrix multiply: (M, K) x (K, N) -> (M, N)
	 * Also handles batched: (..., M, K) x (K, N) -> (..., M, N)
	 *
	 * @param {Tensor|NDArray} other - Right-hand matrix, must be 2D (K, N)
	 * @returns {Tensor}
	 */
	matmul(other) {
		if (this.shape.length < 2) {
			throw new Error(
				`matmul requires this to be at least 2D, got shape [${this.shape}]`,
			);
		}
		if (other.shape.length !== 2) {
			throw new Error(
				`matmul requires other to be 2D, got shape [${other.shape}]. Use matmulBatched() for batched operations`,
			);
		}
		const K = other.shape[0];
		const N = other.shape[1];

		if (this.shape.length === 2) {
			const M = this.shape[0];
			if (this.shape[1] !== K)
				throw new Error(
					`matmul shape mismatch: [${M}, ${this.shape[1]}] x [${K}, ${N}]`,
				);
			const out = new this.data.constructor(M * N);
			for (let m = 0; m < M; m++) {
				for (let k = 0; k < K; k++) {
					const aVal = this.data[m * K + k];
					for (let n = 0; n < N; n++) {
						out[m * N + n] += aVal * other.data[k * N + n];
					}
				}
			}
			return new Tensor(out, [M, N], this.dtype);
		}

		// batched: treat all dims except last 2 as batch
		const batchDims = this.shape.slice(0, -2);
		const M = this.shape[this.shape.length - 2];
		const aK = this.shape[this.shape.length - 1];
		if (aK !== K)
			throw new Error(
				`matmul shape mismatch: ${this.shape} x ${other.shape}`,
			);

		const batchSize = batchDims.reduce((x, y) => x * y, 1);
		const out = new this.data.constructor(batchSize * M * N);
		const aStride = M * K;

		for (let batch = 0; batch < batchSize; batch++) {
			const aOff = batch * aStride;
			const oOff = batch * M * N;
			for (let m = 0; m < M; m++) {
				for (let k = 0; k < K; k++) {
					const aVal = this.data[aOff + m * K + k];
					for (let n = 0; n < N; n++) {
						out[oOff + m * N + n] += aVal * other.data[k * N + n];
					}
				}
			}
		}
		return new Tensor(out, [...batchDims, M, N], this.dtype);
	}

	/**
	 * Batched matmul: (..., M, K) x (..., K, N) -> (..., M, N)
	 * Both operands must have the same batch dims.
	 *
	 * @param {Tensor|NDArray} other - Right-hand batched matrix
	 * @returns {Tensor}
	 */
	matmulBatched(other) {
		if (this.shape.length < 2) {
			throw new Error(
				`matmulBatched requires this to be at least 2D, got shape [${this.shape}]`,
			);
		}
		const batchDims = this.shape.slice(0, -2);
		const M = this.shape[this.shape.length - 2];
		const K = this.shape[this.shape.length - 1];
		const N = other.shape[other.shape.length - 1];
		const bK = other.shape[other.shape.length - 2];
		if (K !== bK)
			throw new Error(`matmulBatched K mismatch: ${K} vs ${bK}`);
		const otherBatchDims = other.shape.slice(0, -2);
		if (
			batchDims.length !== otherBatchDims.length ||
			!batchDims.every((d, i) => d === otherBatchDims[i])
		) {
			throw new Error(
				`matmulBatched batch dims mismatch: [${batchDims}] vs [${otherBatchDims}]`,
			);
		}

		const batchSize = batchDims.reduce((x, y) => x * y, 1);
		const out = new this.data.constructor(batchSize * M * N);
		const aStride = M * K;
		const bStride = K * N;

		for (let batch = 0; batch < batchSize; batch++) {
			const aOff = batch * aStride;
			const bOff = batch * bStride;
			const oOff = batch * M * N;
			for (let m = 0; m < M; m++) {
				for (let k = 0; k < K; k++) {
					const aVal = this.data[aOff + m * K + k];
					for (let n = 0; n < N; n++) {
						out[oOff + m * N + n] +=
							aVal * other.data[bOff + k * N + n];
					}
				}
			}
		}
		return new Tensor(out, [...batchDims, M, N], this.dtype);
	}

	/**
	 * Transpose last two dims: (..., M, N) -> (..., N, M)
	 *
	 * With explicit axes argument, delegates to NDArray.transpose(axes) for
	 * arbitrary axis permutation.
	 *
	 * @param {Array<number>} [axes] - If provided, permutation of all axes (delegates to NDArray)
	 * @returns {Tensor}
	 */
	transpose(axes) {
		if (axes !== undefined) {
			return super.transpose(axes);
		}

		// ML convenience: swap last two dims
		const shape = [...this.shape];
		if (shape.length < 2) {
			return new Tensor(
				new this.data.constructor(this.data),
				shape,
				this.dtype,
			);
		}

		const M = shape[shape.length - 2];
		const N = shape[shape.length - 1];
		const batchDims = shape.slice(0, -2);
		const batchSize = batchDims.reduce((x, y) => x * y, 1);

		const out = new this.data.constructor(this.data.length);
		for (let batch = 0; batch < batchSize; batch++) {
			const off = batch * M * N;
			for (let m = 0; m < M; m++) {
				for (let n = 0; n < N; n++) {
					out[off + n * M + m] = this.data[off + m * N + n];
				}
			}
		}
		return new Tensor(out, [...batchDims, N, M], this.dtype);
	}

	/**
	 * Add a 2D mask to a batched tensor: (..., M, N) + (M, N) -> (..., M, N)
	 *
	 * @param {Tensor|NDArray} mask - 2D mask to broadcast
	 * @returns {Tensor}
	 */
	addMask(mask) {
		if (this.shape.length < 2) {
			throw new Error(
				`addMask requires at least 2D tensor, got shape [${this.shape}]`,
			);
		}
		const M = this.shape[this.shape.length - 2];
		const N = this.shape[this.shape.length - 1];
		if (
			mask.shape.length !== 2 ||
			mask.shape[0] !== M ||
			mask.shape[1] !== N
		) {
			throw new Error(
				`addMask shape mismatch: mask [${mask.shape}] vs last 2 dims [${M}, ${N}]`,
			);
		}
		const MN = M * N;
		const out = new this.data.constructor(this.data.length);
		for (let i = 0; i < this.data.length; i++) {
			out[i] = this.data[i] + mask.data[i % MN];
		}
		return new Tensor(out, [...this.shape], this.dtype);
	}

	/**
	 * Embedding lookup: indices (int array) into table (vocab, dim) -> (seq, dim).
	 * Delegates to NeuralNet.embedding.
	 *
	 * @param {Array<number>|Int32Array} indices - Token indices
	 * @param {Tensor|NDArray} table - Embedding table of shape (vocab, dim)
	 * @returns {Tensor}
	 */
	static embedding(indices, table) {
		return NeuralNet.embedding(indices, table);
	}

	/**
	 * Create causal mask: (S, S) with 0 on/below diagonal, -Infinity above.
	 *
	 * @param {number} S - Sequence length
	 * @returns {Tensor}
	 */
	static causalMask(S) {
		const out = new Float32Array(S * S);
		for (let i = 0; i < S; i++) {
			for (let j = 0; j < S; j++) {
				out[i * S + j] = j > i ? -Infinity : 0;
			}
		}
		return new Tensor(out, [S, S], "float32");
	}
}

/**
 * @fileoverview Neural network operations for Tensor.
 *
 * All methods are static, taking a Tensor as the first argument and returning
 * a new Tensor. Usage: `NeuralNet.gelu(t)`, `NeuralNet.softmax(t)`, etc.
 */
class NeuralNet {
	/**
	 * ReLU activation: max(0, x).
	 *
	 * @param {Tensor} t - Input tensor
	 * @returns {Tensor}
	 */
	static relu(t) {
		const out = new t.data.constructor(t.data.length);
		for (let i = 0; i < t.data.length; i++) {
			const v = t.data[i];
			out[i] = v !== v ? NaN : v > 0 ? v : 0;
		}
		return new Tensor(out, [...t.shape], t.dtype);
	}

	/**
	 * Sigmoid activation: 1 / (1 + exp(-x)).
	 *
	 * @param {Tensor} t - Input tensor
	 * @returns {Tensor}
	 */
	static sigmoid(t) {
		const out = new t.data.constructor(t.data.length);
		for (let i = 0; i < t.data.length; i++) {
			out[i] = 1 / (1 + Math.exp(-t.data[i]));
		}
		return new Tensor(out, [...t.shape], t.dtype);
	}

	/**
	 * Tanh activation: element-wise tanh.
	 *
	 * @param {Tensor} t - Input tensor
	 * @returns {Tensor}
	 */
	static tanh(t) {
		const out = new t.data.constructor(t.data.length);
		for (let i = 0; i < t.data.length; i++) {
			out[i] = Math.tanh(t.data[i]);
		}
		return new Tensor(out, [...t.shape], t.dtype);
	}

	/**
	 * GELU activation (tanh approximation).
	 *
	 * @param {Tensor} t - Input tensor
	 * @returns {Tensor}
	 */
	static gelu(t) {
		const out = new t.data.constructor(t.data.length);
		const sqrt2pi = Math.sqrt(2.0 / Math.PI);
		for (let i = 0; i < t.data.length; i++) {
			const v = t.data[i];
			if (v === -Infinity) {
				out[i] = 0;
			} else {
				out[i] =
					0.5 *
					v *
					(1.0 + Math.tanh(sqrt2pi * (v + 0.044715 * v * v * v)));
			}
		}
		return new Tensor(out, [...t.shape], t.dtype);
	}

	/**
	 * SiLU (Swish) activation: x * sigmoid(x).
	 *
	 * @param {Tensor} t - Input tensor
	 * @returns {Tensor}
	 */
	static silu(t) {
		const out = new t.data.constructor(t.data.length);
		for (let i = 0; i < t.data.length; i++) {
			const v = t.data[i];
			if (v === -Infinity) {
				out[i] = 0;
			} else {
				out[i] = v / (1 + Math.exp(-v));
			}
		}
		return new Tensor(out, [...t.shape], t.dtype);
	}

	/**
	 * Softmax over last dimension (numerically stable).
	 *
	 * @param {Tensor} t - Input tensor
	 * @returns {Tensor}
	 */
	static softmax(t) {
		const shape = [...t.shape];
		const D = shape[shape.length - 1];
		const n = t.data.length / D;
		const out = new t.data.constructor(t.data.length);

		for (let i = 0; i < n; i++) {
			const off = i * D;
			let max = -Infinity;
			for (let d = 0; d < D; d++) {
				if (t.data[off + d] > max) max = t.data[off + d];
			}
			if (max === -Infinity) {
				// All values are -Infinity or NaN (NaN > -Infinity is false)
				let hasNaN = false;
				for (let d = 0; d < D; d++) {
					if (isNaN(t.data[off + d])) {
						hasNaN = true;
						break;
					}
				}
				if (hasNaN) {
					for (let d = 0; d < D; d++) out[off + d] = NaN;
				} else {
					const uniform = 1 / D;
					for (let d = 0; d < D; d++) out[off + d] = uniform;
				}
			} else if (max === Infinity) {
				// Check for NaN — if present, entire output is NaN
				let hasNaN = false;
				for (let d = 0; d < D; d++) {
					if (isNaN(t.data[off + d])) {
						hasNaN = true;
						break;
					}
				}
				if (hasNaN) {
					for (let d = 0; d < D; d++) out[off + d] = NaN;
				} else {
					// Concentrate probability on +Infinity elements
					let infCount = 0;
					for (let d = 0; d < D; d++) {
						if (t.data[off + d] === Infinity) infCount++;
					}
					const p = 1 / infCount;
					for (let d = 0; d < D; d++) {
						out[off + d] = t.data[off + d] === Infinity ? p : 0;
					}
				}
			} else {
				let sum = 0;
				for (let d = 0; d < D; d++) {
					out[off + d] = Math.exp(t.data[off + d] - max);
					sum += out[off + d];
				}
				for (let d = 0; d < D; d++) out[off + d] /= sum;
			}
		}
		return new Tensor(out, shape, t.dtype);
	}

	/**
	 * Layer normalization over last dimension.
	 *
	 * @param {Tensor} t - Input tensor
	 * @param {Tensor|NDArray} weight - Scale parameter (1D, size = last dim)
	 * @param {Tensor|NDArray} bias - Bias parameter (1D, size = last dim)
	 * @param {number} [eps=1e-5] - Epsilon for numerical stability
	 * @returns {Tensor}
	 */
	static layernorm(t, weight, bias, eps = 1e-5) {
		const shape = [...t.shape];
		const D = shape[shape.length - 1];
		if (weight.data.length !== D) {
			throw new Error(
				`layernorm: weight length ${weight.data.length} !== last dim ${D}`,
			);
		}
		if (bias.data.length !== D) {
			throw new Error(
				`layernorm: bias length ${bias.data.length} !== last dim ${D}`,
			);
		}
		const n = t.data.length / D;
		const out = new t.data.constructor(t.data.length);

		for (let i = 0; i < n; i++) {
			const off = i * D;
			let mean = 0;
			for (let d = 0; d < D; d++) mean += t.data[off + d];
			mean /= D;

			let variance = 0;
			for (let d = 0; d < D; d++) {
				const diff = t.data[off + d] - mean;
				variance += diff * diff;
			}
			variance /= D;
			const invStd = 1.0 / Math.sqrt(variance + eps);

			for (let d = 0; d < D; d++) {
				out[off + d] =
					(t.data[off + d] - mean) * invStd * weight.data[d] +
					bias.data[d];
			}
		}
		return new Tensor(out, shape, t.dtype);
	}

	/**
	 * RMS normalization over last dimension.
	 *
	 * @param {Tensor} t - Input tensor
	 * @param {Tensor|NDArray} weight - Scale parameter (1D, size = last dim)
	 * @param {number} [eps=1e-5] - Epsilon for numerical stability
	 * @returns {Tensor}
	 */
	static rmsnorm(t, weight, eps = 1e-5) {
		const shape = [...t.shape];
		const D = shape[shape.length - 1];
		if (weight.data.length !== D) {
			throw new Error(
				`rmsnorm: weight length ${weight.data.length} !== last dim ${D}`,
			);
		}
		const n = t.data.length / D;
		const out = new t.data.constructor(t.data.length);

		for (let i = 0; i < n; i++) {
			const off = i * D;
			let sumSq = 0;
			for (let d = 0; d < D; d++) {
				sumSq += t.data[off + d] * t.data[off + d];
			}
			const invRms = 1.0 / Math.sqrt(sumSq / D + eps);

			for (let d = 0; d < D; d++) {
				out[off + d] = t.data[off + d] * invRms * weight.data[d];
			}
		}
		return new Tensor(out, shape, t.dtype);
	}

	/**
	 * Embedding lookup: indices (int array) into table (vocab, dim) -> (seq, dim).
	 *
	 * @param {Array<number>|Int32Array} indices - Token indices
	 * @param {Tensor|NDArray} table - Embedding table of shape (vocab, dim)
	 * @returns {Tensor}
	 */
	static embedding(indices, table) {
		if (table.shape.length < 2) {
			throw new Error(
				`embedding requires 2D table, got shape [${table.shape}]`,
			);
		}
		const D = table.shape[1];
		const S = indices.length;
		const out = new table.data.constructor(S * D);
		for (let s = 0; s < S; s++) {
			const row = indices[s];
			if (!Number.isInteger(row) || row < 0 || row >= table.shape[0]) {
				throw new Error(
					`embedding index ${row} is invalid (must be integer in [0, ${table.shape[0]}))`,
				);
			}
			const srcOff = row * D;
			const dstOff = s * D;
			for (let d = 0; d < D; d++) {
				out[dstOff + d] = table.data[srcOff + d];
			}
		}
		return new Tensor(out, [S, D], table.dtype || "float32");
	}
}
