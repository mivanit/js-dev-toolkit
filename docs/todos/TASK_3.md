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
- [x] Implement `sum(axis=null)` method
  - [x] Sum over all elements (no axis specified)
  - [x] Sum along specific axis
  - [x] Return scalar or new NDArray based on axis
  - [x] Handle different dtypes appropriately
- [x] Implement `mean(axis=null)` method
  - [x] Mean over all elements
  - [x] Mean along specific axis
  - [x] Handle division by zero edge cases
- [x] Implement `range(axis=null)` method (NEW - efficiency improvement)
  - [x] Compute both min and max in single pass
  - [x] Return [2] array for axis=null, [..., 2] for specific axis
- [x] Implement `min(axis=null)` method
  - [x] Min over all elements
  - [x] Min along specific axis
- [x] Implement `max(axis=null)` method
  - [x] Max over all elements
  - [x] Max along specific axis

### Shape Operations
- [x] Implement `reshape(newShape)` method
  - [x] Validate new shape has same total size
  - [x] Return new NDArray with different shape
  - [x] Support -1 for auto-calculation of one dimension
  - [x] Example: `arr.reshape([2, 3, 4])` or `arr.reshape([2, -1])`
- [x] Implement `transpose(axes=null)` method
  - [x] Default transpose (reverse all axes)
  - [x] Custom axis permutation if axes specified
  - [x] Example: `arr.transpose()` or `arr.transpose([2, 0, 1])`
  - [x] Update shape and strides appropriately

### Helper Methods (Optional but Recommended)
- [x] Implement `flatten()` method
  - [x] Return 1D view of array
- [x] Implement `size` getter property
  - [x] Return total number of elements
- [x] Add axis validation helper
  - [x] Validate axis parameter is within bounds

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

arr.range();         // NDArray([1, 6]) shape [2] (min=1, max=6)
arr.range(0);        // NDArray([1,4,2,5,3,6]) shape [3,2]

arr.reshape([3, 2]); // [[1,2], [3,4], [5,6]]
arr.reshape([6]);    // [1,2,3,4,5,6]
arr.reshape([2,-1]); // [2,3] automatically calculated

arr.transpose();     // [[1,4], [2,5], [3,6]] shape [3,2]
```

## Files to Modify
- `src/array.js` - Add methods to NDArray class (around line 212)

## Testing
- [x] Add unit tests for each operation in `tests/test-array.html`
  - [x] Test sum/mean/min/max with no axis
  - [x] Test sum/mean/min/max with each axis
  - [x] Test range() method with no axis and with axes
  - [x] Test edge cases (empty arrays, single element)
  - [x] Test reshape with various shapes
  - [x] Test reshape with -1 auto-calculation
  - [x] Test reshape validation (incompatible sizes)
  - [x] Test transpose default behavior
  - [x] Test transpose with custom axes
  - [x] Test transpose validation (invalid axes)
- [x] Run `make test` to verify all tests pass
- [x] Test in demo pages (index.html)

## Success Criteria
- [x] All aggregation methods (sum, mean, min, max) work correctly
- [x] Range method efficiently computes both min and max
- [x] Reshape handles all valid cases and rejects invalid ones
- [x] Transpose works for arrays of any dimensionality
- [x] All tests pass
- [x] TODO comment at line 212 is removed

## Related Items from Original TODO.md
- TODO.md line 125: "array.js:212 - Implement NDArray operations"
- TODO.md line 144-148: Features / High Priority - Complete NDArray functionality

## Future Enhancements (Not in This Task)
- Broadcasting operations (add, multiply, etc.)
- Advanced indexing (boolean masks, fancy indexing)
- Linear algebra operations (dot, matmul)
- Statistical operations (std, var, median)

---

## ✅ COMPLETED

### Commit Message
```
feat: implement NDArray operations (sum, mean, range, min, max, reshape, transpose)

Implement essential array operations for NDArray class to enable
numerical computing and data analysis.

Aggregation operations:
- sum(axis): sum over all elements or along specific axis
- mean(axis): mean over all elements or along specific axis
- range(axis): efficiently compute both min and max in single pass
  Returns shape [2] for axis=null, [..., 2] for specific axis
- min(axis): extract minimum from range() results
- max(axis): extract maximum from range() results

Shape operations:
- reshape(newShape): return array with new shape, supports -1 for
  auto-calculation of one dimension
- transpose(axes): return transposed array, default reverses all axes
  or use custom permutation

Helper methods:
- size getter: return total number of elements
- flatten(): return 1D view of array
- _validateAxis(): validate and normalize axis parameter

All methods support negative axis indexing and work with any
dimensionality. Includes comprehensive test coverage with ~40 new
test cases.

Resolves TODO at src/array.js:212
Addresses TASK_3.md requirements
```

### Files Modified
- `src/array.js` - Added 252 lines of new methods (lines 212-464)
- `tests/test-array.html` - Added 362 lines of comprehensive tests
- `index.html` - Added 4 demo functions and buttons for new operations

### Test Results
All 8 test suites passed in 9.07s
- 40+ new test cases for NDArray operations
- Edge case coverage (empty arrays, single elements, negative indices)
- Error validation (invalid axes, incompatible shapes)
