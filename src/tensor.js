/**
 * Minimal pure-JS tensor operations for transformer inference.
 *
 * Tensors are plain objects: { data: Float32Array, shape: number[] }
 */

/** Create a tensor from a Float32Array and shape. */
function tensor(data, shape) {
	return { data: new Float32Array(data), shape: [...shape] };
}

/** Create a tensor of zeros. */
function zeros(shape) {
	const size = shape.reduce((a, b) => a * b, 1);
	return { data: new Float32Array(size), shape: [...shape] };
}

/** Element-wise add. Supports broadcasting b (1D) over last dim of a. */
function add(a, b) {
	if (b.shape.length === 1 && b.shape[0] === a.shape[a.shape.length - 1]) {
		// broadcast bias over last dimension
		const out = new Float32Array(a.data.length);
		const D = b.shape[0];
		for (let i = 0; i < a.data.length; i++) {
			out[i] = a.data[i] + b.data[i % D];
		}
		return { data: out, shape: [...a.shape] };
	}
	// same shape
	const out = new Float32Array(a.data.length);
	for (let i = 0; i < a.data.length; i++) {
		out[i] = a.data[i] + b.data[i];
	}
	return { data: out, shape: [...a.shape] };
}

/**
 * 2D matrix multiply: (M, K) x (K, N) -> (M, N)
 * Also handles batched: (..., M, K) x (K, N) -> (..., M, N)
 */
function matmul(a, b) {
	const K = b.shape[0];
	const N = b.shape[1];

	if (a.shape.length === 2) {
		const M = a.shape[0];
		const out = new Float32Array(M * N);
		for (let m = 0; m < M; m++) {
			for (let n = 0; n < N; n++) {
				let sum = 0;
				for (let k = 0; k < K; k++) {
					sum += a.data[m * K + k] * b.data[k * N + n];
				}
				out[m * N + n] = sum;
			}
		}
		return { data: out, shape: [M, N] };
	}

	// batched: treat all dims except last 2 as batch
	const batchDims = a.shape.slice(0, -2);
	const M = a.shape[a.shape.length - 2];
	const aK = a.shape[a.shape.length - 1];
	if (aK !== K) throw new Error(`matmul shape mismatch: ${a.shape} x ${b.shape}`);

	const batchSize = batchDims.reduce((x, y) => x * y, 1);
	const out = new Float32Array(batchSize * M * N);
	const aStride = M * K;

	for (let batch = 0; batch < batchSize; batch++) {
		const aOff = batch * aStride;
		const oOff = batch * M * N;
		for (let m = 0; m < M; m++) {
			for (let n = 0; n < N; n++) {
				let sum = 0;
				for (let k = 0; k < K; k++) {
					sum += a.data[aOff + m * K + k] * b.data[k * N + n];
				}
				out[oOff + m * N + n] = sum;
			}
		}
	}
	return { data: out, shape: [...batchDims, M, N] };
}

/**
 * Batched matmul: (..., M, K) x (..., K, N) -> (..., M, N)
 * Both a and b must have same batch dims.
 */
function matmulBatched(a, b) {
	const batchDims = a.shape.slice(0, -2);
	const M = a.shape[a.shape.length - 2];
	const K = a.shape[a.shape.length - 1];
	const N = b.shape[b.shape.length - 1];
	const bK = b.shape[b.shape.length - 2];
	if (K !== bK) throw new Error(`matmulBatched K mismatch: ${K} vs ${bK}`);

	const batchSize = batchDims.reduce((x, y) => x * y, 1);
	const out = new Float32Array(batchSize * M * N);
	const aStride = M * K;
	const bStride = K * N;

	for (let batch = 0; batch < batchSize; batch++) {
		const aOff = batch * aStride;
		const bOff = batch * bStride;
		const oOff = batch * M * N;
		for (let m = 0; m < M; m++) {
			for (let n = 0; n < N; n++) {
				let sum = 0;
				for (let k = 0; k < K; k++) {
					sum += a.data[aOff + m * K + k] * b.data[bOff + k * N + n];
				}
				out[oOff + m * N + n] = sum;
			}
		}
	}
	return { data: out, shape: [...batchDims, M, N] };
}

/** Transpose last two dims: (..., M, N) -> (..., N, M) */
function transpose(a) {
	const shape = [...a.shape];
	const M = shape[shape.length - 2];
	const N = shape[shape.length - 1];
	const batchDims = shape.slice(0, -2);
	const batchSize = batchDims.reduce((x, y) => x * y, 1);

	const out = new Float32Array(a.data.length);
	for (let batch = 0; batch < batchSize; batch++) {
		const off = batch * M * N;
		for (let m = 0; m < M; m++) {
			for (let n = 0; n < N; n++) {
				out[off + n * M + m] = a.data[off + m * N + n];
			}
		}
	}
	const outShape = [...batchDims, N, M];
	return { data: out, shape: outShape };
}

/** Layer normalization over last dimension. */
function layernorm(x, weight, bias, eps = 1e-5) {
	const shape = [...x.shape];
	const D = shape[shape.length - 1];
	const n = x.data.length / D;
	const out = new Float32Array(x.data.length);

	for (let i = 0; i < n; i++) {
		const off = i * D;
		// compute mean
		let mean = 0;
		for (let d = 0; d < D; d++) mean += x.data[off + d];
		mean /= D;
		// compute variance
		let variance = 0;
		for (let d = 0; d < D; d++) {
			const diff = x.data[off + d] - mean;
			variance += diff * diff;
		}
		variance /= D;
		const invStd = 1.0 / Math.sqrt(variance + eps);
		// normalize and scale
		for (let d = 0; d < D; d++) {
			out[off + d] =
				(x.data[off + d] - mean) * invStd * weight.data[d] + bias.data[d];
		}
	}
	return { data: out, shape };
}

/** Softmax over last dimension (numerically stable). */
function softmax(x) {
	const shape = [...x.shape];
	const D = shape[shape.length - 1];
	const n = x.data.length / D;
	const out = new Float32Array(x.data.length);

	for (let i = 0; i < n; i++) {
		const off = i * D;
		// find max
		let max = -Infinity;
		for (let d = 0; d < D; d++) {
			if (x.data[off + d] > max) max = x.data[off + d];
		}
		// exp and sum
		let sum = 0;
		for (let d = 0; d < D; d++) {
			out[off + d] = Math.exp(x.data[off + d] - max);
			sum += out[off + d];
		}
		// normalize
		for (let d = 0; d < D; d++) {
			out[off + d] /= sum;
		}
	}
	return { data: out, shape };
}

/** GELU activation (tanh approximation). */
function gelu(x) {
	const out = new Float32Array(x.data.length);
	const sqrt2pi = Math.sqrt(2.0 / Math.PI);
	for (let i = 0; i < x.data.length; i++) {
		const v = x.data[i];
		out[i] =
			0.5 * v * (1.0 + Math.tanh(sqrt2pi * (v + 0.044715 * v * v * v)));
	}
	return { data: out, shape: [...x.shape] };
}

/** Embedding lookup: indices (int array) into table (vocab, dim) -> (seq, dim). */
function embedding(indices, table) {
	const D = table.shape[1];
	const S = indices.length;
	const out = new Float32Array(S * D);
	for (let s = 0; s < S; s++) {
		const row = indices[s];
		const srcOff = row * D;
		const dstOff = s * D;
		for (let d = 0; d < D; d++) {
			out[dstOff + d] = table.data[srcOff + d];
		}
	}
	return { data: out, shape: [S, D] };
}

/** Create causal mask: (S, S) with 0 on/below diagonal, -Infinity above. */
function causalMask(S) {
	const out = new Float32Array(S * S);
	for (let i = 0; i < S; i++) {
		for (let j = 0; j < S; j++) {
			out[i * S + j] = j > i ? -Infinity : 0;
		}
	}
	return { data: out, shape: [S, S] };
}

/** Reshape tensor (must preserve total element count). */
function reshape(x, newShape) {
	return { data: x.data, shape: [...newShape] };
}

/**
 * Slice along a dimension: extract [start, end) along given axis.
 * Returns a new contiguous tensor.
 */
function sliceDim(x, dim, start, end) {
	const shape = x.shape;
	const rank = shape.length;
	if (dim < 0) dim = rank + dim;

	const newShape = [...shape];
	newShape[dim] = end - start;

	const outerSize = shape.slice(0, dim).reduce((a, b) => a * b, 1);
	const innerSize = shape.slice(dim + 1).reduce((a, b) => a * b, 1);
	const dimSize = shape[dim];
	const sliceSize = (end - start) * innerSize;

	const out = new Float32Array(newShape.reduce((a, b) => a * b, 1));

	for (let outer = 0; outer < outerSize; outer++) {
		for (let d = start; d < end; d++) {
			const srcOff = (outer * dimSize + d) * innerSize;
			const dstOff = outer * sliceSize + (d - start) * innerSize;
			for (let inner = 0; inner < innerSize; inner++) {
				out[dstOff + inner] = x.data[srcOff + inner];
			}
		}
	}
	return { data: out, shape: newShape };
}

/** Scale all elements by a scalar. */
function scale(x, s) {
	const out = new Float32Array(x.data.length);
	for (let i = 0; i < x.data.length; i++) {
		out[i] = x.data[i] * s;
	}
	return { data: out, shape: [...x.shape] };
}

/** Add a 2D mask to a batched tensor: (..., M, N) + (M, N) -> (..., M, N) */
function addMask(x, mask) {
	const MN = mask.data.length;
	const out = new Float32Array(x.data.length);
	for (let i = 0; i < x.data.length; i++) {
		out[i] = x.data[i] + mask.data[i % MN];
	}
	return { data: out, shape: [...x.shape] };
}
