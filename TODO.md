# TODO for js-dev-toolkit

## Status Key
- `[ ]` - Incomplete
- `[x]` - Complete
- `[?]` - Unsure of completion status
- `[~]` - Partially complete
- `[/]` - Maybe remove this TODO

## Testing

### High Priority
- [x] Run all tests and fix any failures (8/8 test suites passing)
  - [x] Test DataFrame functionality
  - [x] Test ColorUtil color mapping
  - [x] Test NDArray JSON deserialization
  - [x] Test YAML serialization edge cases
  - [x] Test sparklines SVG generation
  - [x] Test DataTable DOM interactions
  - [x] Test notification system timing
  - [x] Test config URL parameter parsing

- [?] Fix any issues with mock DOM in tests (using real browser via Playwright, not mocks)
  - [?] Ensure DataTable tests work with mock environment
  - [?] Verify notification system tests handle timeouts correctly
  - [?] Test config system with mock window/fetch

- [~] Add missing test coverage (added smoke tests for high-priority functions)
  - [x] array.js: float16ToFloat32() and float16ToFloat32Array()
  - [x] DataFrame.js: get(), col_apply(), from_jsonl(), to_jsonl()
  - [x] ColorUtil.js: generateDistinctColors()
  - [x] config.js: resetConfigPreserveKey(), exportConfigToNewTab()
  - [x] table.js: addRow(), setPageSize(), clearAllFilters(), exportCSV()
  - [x] table.js: Numeric filters (>, <=, ==)
  - [x] table.js: Wildcard filters (foo*, *bar, *baz*)
  - [ ] array.js: npyjs class (parse, load, loadNPZ, parseZIP)
    - Requires: mock ArrayBuffer for .npy parsing, JSZip for .npz parsing
    - Complex: needs binary NPY/NPZ test files or mocked binary data
  - [ ] array.js: NDArray.parse() static method (parses NPY format from ArrayBuffer)
  - [ ] DataFrame.js: CSV parsing with proper quote escaping (current impl is simple)
  - [ ] table.js: Custom column renderers, filter functions, sort functions
  - [ ] table.js: Column resizing behavior
  - [ ] table.js: Pagination edge cases (page validation)
  - [ ] notif.js: Animation and positioning logic
  - [ ] config.js: URL update debouncing
  - [ ] config.js: Full getConfig() async flow with fetch
  - [ ] config.js: Array parameter parsing (tilde-separated values)
  - [ ] sparklines.js: More axis configurations

### Testing Infrastructure
- [x] Migrate from Node.js VM-based tests to browser-based tests with Playwright
- [x] Create Python pytest test runner with parametrization
- [x] Create test-framework.js for browser testing (describe/it/assert API)
- [x] Set up make test command to run all browser tests
- [ ] Add test coverage reporting
- [ ] Add test performance benchmarking

### Medium Priority
- [ ] Add integration tests
  - [ ] Test DataFrame → DataTable workflow
  - [ ] Test config loading → UI rendering
  - [ ] Test notification system with real DOM in browser

- [ ] Add browser compatibility tests
  - [ ] Test in Chrome, Firefox, Safari
  - [ ] Test mobile browsers
  - [ ] Verify IE11 compatibility (if needed)

- [ ] Add performance tests
  - [ ] DataFrame operations on large datasets
  - [ ] DataTable rendering with many rows
  - [ ] Sparkline generation with many data points

## Documentation

### High Priority
- [ ] Update README.md with (CRITICAL - currently only 4 lines):
  - [ ] Module descriptions (notif, ColorUtil, array, DataFrame, table, sparklines, config, yaml)
  - [ ] Installation instructions
  - [ ] Usage examples for each module
  - [ ] Quick start guide
  - [ ] API documentation
  - [ ] Browser compatibility info
  - [ ] License information
  - [ ] Link to demos (index.html, demos/grid.html, demos/sparklines.html)
  - [ ] Document that notif.css must be included for notification styling
  - [ ] Document JSZip requirement for NPZ file support (optional dependency)

- [ ] Add JSDoc comments to all public functions
  - [ ] DataFrame.js - add param/return types
  - [ ] ColorUtil.js - document colormap options
  - [ ] array.js - document NPY/NPZ format support
  - [ ] yaml.js - document limitations vs full YAML spec
  - [ ] sparklines.js - document all options with examples
  - [ ] table.js - document column config options
  - [ ] notif.js - document all notification types
  - [ ] config.js - document configuration system flow

### Medium Priority
- [~] Create usage examples (demos exist but not documented)
  - [x] index.html - comprehensive functionality test (exists)
  - [x] demos/grid.html - DataTable grid demo (exists)
  - [x] demos/sparklines.html - sparklines gallery (exists)
  - [ ] Document existing demos in README
  - [ ] Create standalone examples for:
    - [ ] DataFrame data manipulation
    - [ ] Notification system patterns
    - [ ] Configuration management patterns
    - [ ] ColorUtil color mapping

- [ ] Add tutorials
  - [ ] Getting started guide
  - [ ] Building a data dashboard
  - [ ] Customizing the DataTable component

## Code Quality

### High Priority

- [ ] Fix cSpell warnings
  - [ ] Add technical terms to dictionary (ndim, dtypes, colormap, etc.)

- [ ] Review and implement TODOs in source files (CRITICAL)
  - [ ] table.js - Verify all _TABLE_CONSTS are used correctly
  - [ ] array.js:212 - Implement NDArray operations (sum, mean, reshape, transpose)

- [x] Bug fixes completed
  - [x] Fixed parseConfigValue undefined reference in config.js:144 (changed to decodeFromURL)
  - [x] Removed debug console.error from sparklines.js:139-140

### Medium Priority

- [ ] Consider bundling notif.css with notif.js or documenting requirement clearly

- [ ] CSS/Styling
  - [ ] Document that notif.css is required for NotificationManager
  - [ ] Consider inline styles or JS-based styling to avoid external CSS dependency
  - [ ] Add CSS variables for theming notif.css
  - [ ] DataTable styles are inline (good) but could be customizable

## Features

### High Priority
- [ ] Complete NDArray functionality
  - [ ] Implement sum, mean, min, max aggregations
  - [ ] Implement reshape operation
  - [ ] Implement transpose operation

- [ ] DataTable enhancements
  - [ ] Add keyboard navigation
  - [ ] Add column reordering (drag & drop)
  - [ ] Add row selection
  - [ ] column groups, collapsing/expanding?

### Medium Priority
- [ ] DataFrame enhancements
  - [ ] Add filtering methods
  - [ ] Add sorting methods
  - [ ] Add groupby operations
  - [ ] Add merge/join operations

### Low Priority
- [ ] notif.js improvements
  - [ ] Add notification positioning options
  - [ ] Add custom icons/styling
  - [ ] Add action buttons in notifications
  - [ ] Add notification history

- [ ] config.js improvements
  - [ ] Add config validation schemas
  - [ ] Add config import/export UI

- [ ] Set up build process
  - [ ] Minify for production

- [ ] Set up CI/CD
  - [ ] GitHub Actions for tests
  - [ ] Automated testing on push
  - [ ] Coverage reporting

## Dependencies & Compatibility

### Review & Document (CRITICAL)
- [ ] Document external dependencies
  - [ ] JSZip for NPZ file support (src/array.js:168 - `new JSZip()` but not included)
  - [ ] JSZip is optional - only needed for .npz files, not .npy files
  - [ ] Browser API requirements:
    - [ ] fetch() for config.js and array.js file loading
    - [ ] Blob and URL.createObjectURL() for config export
    - [ ] navigator.clipboard for table.js CSV copy
    - [ ] window.open() for config export to new tab
  - [ ] No npm dependencies currently - all vanilla JS

## Nice to Have

- [ ] Add TypeScript definitions (.d.ts files)
- [~] Create interactive playground/demo site
- [ ] Add accessibility (a11y) improvements to DataTable

## Notes

- [x] Tests migrated to browser-based with Playwright (8/8 test suites passing)
- [x] Added smoke tests for high-priority untested functions
- [ ] Some features still have TODO comments in source code that need attention
- [ ] Browser compatibility testing needed (Chrome, Firefox, Safari)
- Test runner uses Python pytest with Playwright for browser automation
- All tests run in real browser environment (not Node.js VM or mocks)
