# Task 3: Implement NDArray Operations

## Description
Complete the NDArray class implementation by adding common array operations. This addresses the TODO comment at `src/array.js:212`.

## Goals
Implement essential array operations to make NDArray more useful for numerical computing and data analysis.

## Current State
- NDArray class exists with basic indexing and slicing
- TODO comment at line 212: `// TODO: sum, mean, reshape, transpose, etc`
- Data is stored in flat typed arrays with shape metadata

## Checklist

### Aggregation Operations
- [ ] Implement `sum(axis=null)` method
  - [ ] Sum over all elements (no axis specified)
  - [ ] Sum along specific axis
  - [ ] Return scalar or new NDArray based on axis
  - [ ] Handle different dtypes appropriately
- [ ] Implement `mean(axis=null)` method
  - [ ] Mean over all elements
  - [ ] Mean along specific axis
  - [ ] Handle division by zero edge cases
- [ ] Implement `min(axis=null)` method
  - [ ] Min over all elements
  - [ ] Min along specific axis
- [ ] Implement `max(axis=null)` method
  - [ ] Max over all elements
  - [ ] Max along specific axis

### Shape Operations
- [ ] Implement `reshape(newShape)` method
  - [ ] Validate new shape has same total size
  - [ ] Return new NDArray with different shape
  - [ ] Support -1 for auto-calculation of one dimension
  - [ ] Example: `arr.reshape([2, 3, 4])` or `arr.reshape([2, -1])`
- [ ] Implement `transpose(axes=null)` method
  - [ ] Default transpose (reverse all axes)
  - [ ] Custom axis permutation if axes specified
  - [ ] Example: `arr.transpose()` or `arr.transpose([2, 0, 1])`
  - [ ] Update shape and strides appropriately

### Helper Methods (Optional but Recommended)
- [ ] Implement `flatten()` method
  - [ ] Return 1D view of array
- [ ] Implement `size` getter property
  - [ ] Return total number of elements
- [ ] Add axis validation helper
  - [ ] Validate axis parameter is within bounds

## Implementation Notes

### Axis Parameter
The `axis` parameter determines which dimension to operate over:
- `axis=null` (default): operate over all elements, return scalar
- `axis=0`: operate over first dimension
- `axis=1`: operate over second dimension, etc.
- For 2D array shape `[3, 4]`:
  - `axis=0` reduces to shape `[4]`
  - `axis=1` reduces to shape `[3]`

### Shape Validation
- Reshape must preserve total size: `prod(oldShape) === prod(newShape)`
- Transpose axes must be valid permutation of dimensions

### Example Usage
```javascript
let arr = new NDArray(new Float32Array([1,2,3,4,5,6]), [2,3]);
// [[1,2,3],
//  [4,5,6]]

arr.sum();           // 21 (scalar)
arr.sum(0);          // NDArray([5,7,9]) shape [3]
arr.sum(1);          // NDArray([6,15]) shape [2]

arr.mean();          // 3.5
arr.mean(0);         // NDArray([2.5, 3.5, 4.5])

arr.reshape([3, 2]); // [[1,2], [3,4], [5,6]]
arr.reshape([6]);    // [1,2,3,4,5,6]
arr.reshape([2,-1]); // [2,3] automatically calculated

arr.transpose();     // [[1,4], [2,5], [3,6]] shape [3,2]
```

## Files to Modify
- `src/array.js` - Add methods to NDArray class (around line 212)

## Testing
- [ ] Add unit tests for each operation in `tests/test-array.html`
  - [ ] Test sum/mean/min/max with no axis
  - [ ] Test sum/mean/min/max with each axis
  - [ ] Test edge cases (empty arrays, single element)
  - [ ] Test reshape with various shapes
  - [ ] Test reshape with -1 auto-calculation
  - [ ] Test reshape validation (incompatible sizes)
  - [ ] Test transpose default behavior
  - [ ] Test transpose with custom axes
  - [ ] Test transpose validation (invalid axes)
- [ ] Run `make test` to verify all tests pass
- [ ] Test in demo pages (index.html)

## Success Criteria
- All aggregation methods (sum, mean, min, max) work correctly
- Reshape handles all valid cases and rejects invalid ones
- Transpose works for arrays of any dimensionality
- All tests pass
- TODO comment at line 212 is removed

## Related Items from Original TODO.md
- TODO.md line 125: "array.js:212 - Implement NDArray operations"
- TODO.md line 144-148: Features / High Priority - Complete NDArray functionality

## Future Enhancements (Not in This Task)
- Broadcasting operations (add, multiply, etc.)
- Advanced indexing (boolean masks, fancy indexing)
- Linear algebra operations (dot, matmul)
- Statistical operations (std, var, median)
