# Tests for js-dev-toolkit

This directory contains comprehensive tests for all functionality in js-dev-toolkit, following the testing patterns from zanj-js.

## Test Structure

### Test Files

- **test-helpers.js** - Common test utilities including:
  - Array comparison functions
  - Source file loading utilities
  - Mock DOM creation for browser-dependent code
  - JSON file loading helpers

- **test-DataFrame.js** - Tests for DataFrame class:
  - Constructor and data initialization
  - Column operations (col, col_unique, col_apply)
  - Row operations (row, get)
  - CSV parsing and serialization
  - JSONL parsing and serialization
  - HTML table generation
  - Edge cases and error handling

- **test-ColorUtil.js** - Tests for color utilities:
  - HSL to hex conversion
  - Distinct color generation
  - Color mapping for values
  - Colormap support (blues, reds, viridis, plasma)
  - Value interpolation and clamping

- **test-array.js** - Tests for NDArray class:
  - Constructor and shape validation
  - Get/set operations with indexing
  - Slicing with null indices
  - JSON deserialization (array_list_meta, array_b64_meta, array_hex_meta, zero_dim)
  - Format inference
  - Multiple data types (uint8-64, int8-64, float32/64)
  - BigInt support for 64-bit integers
  - Edge cases (empty, single element, high-dimensional)

- **test-yaml.js** - Tests for YAML serialization:
  - Primitive type serialization (strings, numbers, booleans, null)
  - Array serialization (inline and multiline)
  - Nested object serialization
  - Special character handling
  - Indentation correctness
  - Frontmatter generation
  - Real-world examples (blog metadata, configs)

- **test-sparklines.js** - Tests for sparkline/sparkbar generation:
  - Basic SVG generation
  - Option handling (width, height, color, lineWidth)
  - X/Y value pairs
  - Axis rendering
  - Shading (solid and gradient)
  - Log scale support
  - Markers
  - Bar chart variations
  - Edge cases (single value, large ranges)

- **test-table.js** - Tests for DataTable component:
  - Constructor and initialization
  - Column inference and explicit definition
  - Data manipulation (setData, addRow, setPageSize)
  - Pagination (getTotalPages, getPageData)
  - Nested value access with dot notation
  - Type inference
  - Numeric filtering with operators (>, <, >=, <=, ==, !=)
  - Sorting (ascending, descending, null handling)
  - CSV export
  - Mock DOM integration

- **test-notif.js** - Tests for notification system:
  - Constructor with custom options
  - show() - regular notifications with auto-hide
  - spinner() - persistent loading indicators
  - pbar() - progress bars with update capability
  - success() - success messages
  - error() - error messages with optional Error objects
  - clear() - remove all notifications
  - Multiple notification handling
  - Mock DOM integration

- **test-config.js** - Tests for configuration management:
  - deepMerge() - deep object merging
  - setNestedConfigValue() - dot notation value setting
  - getConfigValue() - dot notation value retrieval
  - setConfigValue() - value setting with URL sync
  - findConfigDifferences() - config comparison with epsilon for floats
  - arraysEqual() - array comparison
  - URL encoding/decoding
  - Edge cases (null, undefined, 0, false, empty string)

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npm run test:DataFrame
npm run test:ColorUtil
npm run test:array
npm run test:yaml
npm run test:sparklines
npm run test:table
npm run test:notif
npm run test:config
```

### Run individual test file directly
```bash
node --test tests/test-DataFrame.js
```

## Test Patterns

Following the patterns from zanj-js:

1. **Use of Node.js test runner** - Built-in `node:test` module with `describe` and `it`
2. **Test helpers** - Shared utilities for common operations
3. **Sandbox execution** - Using `vm` module to load source files in isolated contexts
4. **Mock environments** - Mock DOM for browser-dependent code
5. **Comprehensive coverage** - Testing normal cases, edge cases, and error conditions
6. **Assert-based testing** - Using Node.js `assert` module
7. **Clear test names** - Descriptive test names that explain what is being tested

## Requirements

- Node.js >= 18.0.0 (for built-in test runner)
- No external test dependencies required

## Notes

- Tests use mock DOM for browser-dependent code (table.js, notif.js, config.js)
- Array tests include polyfills for `atob`/`btoa` for base64 encoding
- Tests follow CommonJS module format to match the source files
- All tests are self-contained and can be run independently
