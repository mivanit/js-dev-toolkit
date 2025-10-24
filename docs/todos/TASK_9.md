# Task 9: Add Missing Unit Test Coverage - NPY/NPZ

**Priority:** MEDIUM
**Effort:** Medium-Large (4-6 hours)
**Type:** Testing - Binary Format Testing
**Dependencies:** None (but may need JSZip library installed/available)

## Status
- [ ] Not Started

## Description
Add comprehensive test coverage for NPY and NPZ file format parsing in array.js. This is currently untested due to complexity of binary formats.

## Goals
- Test NPY file parsing (NumPy binary format)
- Test NPZ file parsing (ZIP archive of NPY files)
- Test NDArray.parse() static method
- Test npyjs class methods (parse, load, loadNPZ, parseZIP)
- Ensure robust error handling for malformed files

## Current State
- array.js contains npyjs class and NPY/NPZ parsing code
- No tests exist for binary format parsing
- Original TODO.md notes: "Complex: needs binary NPY/NPZ test files or mocked binary data"
- JSZip dependency required for NPZ support

## Challenges
1. **Binary Test Data**: Need real or mocked .npy/.npz binary files
2. **ArrayBuffer Testing**: Browser environment needed (already using Playwright)
3. **JSZip Dependency**: Need to ensure JSZip is available in test environment
4. **Format Complexity**: NPY format has specific header structure and byte ordering

## Checklist

### Test Infrastructure Setup
- [ ] Add JSZip to test environment
  - [ ] Include JSZip in test HTML files
  - [ ] Or: Use CDN link for JSZip
  - [ ] Verify JSZip is available: `typeof JSZip !== 'undefined'`
- [ ] Create binary test data
  - [ ] Option 1: Generate small .npy files using Python's NumPy
  - [ ] Option 2: Create mock binary data in JavaScript
  - [ ] Option 3: Use base64-encoded binary data in tests
  - [ ] Store test files in `tests/fixtures/` directory

### NPY Format Tests
- [ ] Test basic NPY parsing
  - [ ] Parse 1D float32 array
  - [ ] Parse 2D int32 array
  - [ ] Parse 3D float64 array
  - [ ] Parse boolean array
  - [ ] Parse uint8 array (common for images)
- [ ] Test NPY header parsing
  - [ ] Verify magic number validation (`\x93NUMPY`)
  - [ ] Parse version (1.0, 2.0, 3.0)
  - [ ] Parse dtype from header
  - [ ] Parse shape from header
  - [ ] Parse fortran_order flag
- [ ] Test NDArray.parse() static method
  - [ ] Parse from ArrayBuffer
  - [ ] Return correct NDArray instance
  - [ ] Verify shape and dtype
  - [ ] Verify data values

### NPZ Format Tests
- [ ] Test NPZ parsing (ZIP of NPY files)
  - [ ] Parse NPZ with single array
  - [ ] Parse NPZ with multiple arrays
  - [ ] Access arrays by name
  - [ ] Handle missing arrays (error case)
- [ ] Test npyjs.loadNPZ() method
  - [ ] Load from URL (mock fetch or use data URL)
  - [ ] Return object with array names as keys
  - [ ] Each value is an NDArray
- [ ] Test npyjs.parseZIP() method
  - [ ] Parse JSZip object
  - [ ] Extract all .npy files
  - [ ] Return object with arrays

### Error Handling Tests
- [ ] Test invalid NPY files
  - [ ] Wrong magic number
  - [ ] Corrupted header
  - [ ] Mismatched data length
  - [ ] Unsupported dtype
  - [ ] Unsupported version
- [ ] Test invalid NPZ files
  - [ ] Not a valid ZIP file
  - [ ] ZIP with no .npy files
  - [ ] Corrupted .npy file inside NPZ
- [ ] Test edge cases
  - [ ] Empty array (shape [0])
  - [ ] Scalar (shape [])
  - [ ] Very large arrays (performance consideration)
  - [ ] Fortran-ordered arrays

### Helper Tests
- [ ] Test byte order handling
  - [ ] Little-endian (most common)
  - [ ] Big-endian
- [ ] Test dtype conversion
  - [ ] NumPy dtypes to JavaScript typed arrays
  - [ ] All supported dtypes

## Implementation Notes

### Creating Test NPY Files
Use Python to generate test files:
```python
import numpy as np

# Create test arrays
arr_1d = np.array([1.0, 2.0, 3.0, 4.0], dtype=np.float32)
arr_2d = np.array([[1, 2, 3], [4, 5, 6]], dtype=np.int32)
arr_bool = np.array([True, False, True], dtype=np.bool_)

# Save as .npy
np.save('tests/fixtures/test_1d_float32.npy', arr_1d)
np.save('tests/fixtures/test_2d_int32.npy', arr_2d)
np.save('tests/fixtures/test_bool.npy', arr_bool)

# Save as .npz
np.savez('tests/fixtures/test_multi.npz',
         array1=arr_1d,
         array2=arr_2d,
         bools=arr_bool)
```

### Alternative: Base64 Encoded Test Data
If we don't want to check in binary files:
```javascript
// Encode binary data as base64 string in test file
const npy_1d_float32_base64 = 'k05VTVBZAQB2AHsnZGVzY3InOiAnPGY0Jywg...';

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Use in test
const arrayBuffer = base64ToArrayBuffer(npy_1d_float32_base64);
const arr = NDArray.parse(arrayBuffer);
```

### Mocking Fetch for URL Loading
```javascript
// Mock fetch for testing npyjs.load()
const originalFetch = window.fetch;
window.fetch = async (url) => {
  if (url.includes('test_array.npy')) {
    const arrayBuffer = /* test data */;
    return {
      ok: true,
      arrayBuffer: async () => arrayBuffer
    };
  }
  return originalFetch(url);
};
```

### NPY Format Reference
NPY file structure:
1. Magic number: `\x93NUMPY` (6 bytes)
2. Version: `\x01\x00` or `\x02\x00` (2 bytes)
3. Header length: uint16 or uint32 (depends on version)
4. Header: Python dict as ASCII string (padded with spaces, ends with newline)
5. Data: Raw binary data in specified dtype

Example header:
```
{'descr': '<f4', 'fortran_order': False, 'shape': (3, 4)}
```

## Files to Modify
- `tests/test-array.html` - Add NPY/NPZ tests
- `tests/fixtures/` - Create directory for test binary files
- Possibly `tests/fixtures/generate_test_files.py` - Script to generate test data

## Testing Approach
1. Create or generate small test NPY/NPZ files
2. Load them in test environment (via fetch or embedded base64)
3. Parse and verify structure and data
4. Test error cases with malformed data

## Success Criteria
- All npyjs class methods have tests
- NDArray.parse() tested with various formats
- Both NPY and NPZ formats tested
- Error handling tested
- All tests pass
- JSZip dependency properly integrated

## Related Items from Original TODO.md
- TODO.md line 36-39: Testing / High Priority - Add missing test coverage
- TODO.md line 185-186: Dependencies - Document JSZip requirement

## References
- [NPY Format Specification](https://numpy.org/doc/stable/reference/generated/numpy.lib.format.html)
- [JSZip Documentation](https://stuk.github.io/jszip/)

## Future Enhancements (Not in This Task)
- Performance benchmarks for large files
- Streaming/chunked loading for very large arrays
- Support for more exotic NumPy dtypes
- NPY format version 3.0 support
