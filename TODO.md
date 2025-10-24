# TODO for js-dev-toolkit

## Testing

### High Priority
- [ ] Run all tests and fix any failures
  - [ ] Test DataFrame functionality
  - [ ] Test ColorUtil color mapping
  - [ ] Test NDArray JSON deserialization
  - [ ] Test YAML serialization edge cases
  - [ ] Test sparklines SVG generation
  - [ ] Test DataTable DOM interactions
  - [ ] Test notification system timing
  - [ ] Test config URL parameter parsing

- [ ] Fix any issues with mock DOM in tests
  - [ ] Ensure DataTable tests work with mock environment
  - [ ] Verify notification system tests handle timeouts correctly
  - [ ] Test config system with mock window/fetch

- [ ] Add missing test coverage
  - [ ] table.js: Custom column renderers, filter functions, sort functions
  - [ ] table.js: Column resizing behavior
  - [ ] table.js: Pagination edge cases (page validation)
  - [ ] notif.js: Animation and positioning logic
  - [ ] config.js: URL update debouncing
  - [ ] config.js: Full getConfig() async flow with fetch
  - [ ] sparklines.js: More axis configurations
  - [ ] array.js: NPY/NPZ file loading (needs mock fetch)

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
- [ ] Update README.md with:
  - [ ] Installation instructions
  - [ ] Usage examples for each module
  - [ ] API documentation
  - [ ] Browser compatibility info
  - [ ] License information

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
- [ ] Create usage examples
  - [ ] DataFrame data manipulation examples
  - [ ] DataTable interactive demos
  - [ ] Sparkline visualization examples
  - [ ] Notification system patterns
  - [ ] Configuration management patterns

- [ ] Add tutorials
  - [ ] Getting started guide
  - [ ] Building a data dashboard
  - [ ] Customizing the DataTable component

## Code Quality

### High Priority
- [ ] Address TypeScript diagnostics
  - [ ] Convert CommonJS to ES modules (or suppress warnings)
  - [ ] Fix unused parameter warnings in test-helpers.js

- [ ] Fix cSpell warnings
  - [ ] Add technical terms to dictionary (ndim, dtypes, colormap, etc.)

- [ ] Review TODOs in source files
  - [ ] config.js: Define actual default configuration structure
  - [ ] config.js: Customize encodeForURL for special characters
  - [ ] config.js: Implement decodeFromURL to reverse encoding
  - [ ] config.js: Define URL_SKIP_PATHS for large data arrays
  - [ ] config.js: Define COMPARISON_SKIP_KEYS for volatile keys
  - [ ] table.js: Verify all _TABLE_CONSTS are used correctly
  - [ ] array.js: Implement NDArray operations (sum, mean, reshape, transpose)

### Medium Priority
- [ ] Add error handling improvements
  - [ ] Better error messages with context
  - [ ] Input validation for all public APIs
  - [ ] Graceful degradation when features unavailable

- [ ] Code organization
  - [ ] Consider splitting large files (table.js is 1100+ lines)
  - [ ] Extract constants to separate files
  - [ ] Create a unified exports file

## Features

### High Priority
- [ ] Complete NDArray functionality
  - [ ] Implement sum, mean, min, max aggregations
  - [ ] Implement reshape operation
  - [ ] Implement transpose operation
  - [ ] Add more utility methods

- [ ] DataTable enhancements
  - [ ] Add keyboard navigation
  - [ ] Add column reordering (drag & drop)
  - [ ] Add row selection
  - [ ] Add bulk actions

### Medium Priority
- [ ] DataFrame enhancements
  - [ ] Add filtering methods
  - [ ] Add sorting methods
  - [ ] Add groupby operations
  - [ ] Add merge/join operations

- [ ] Sparklines enhancements
  - [ ] Add more chart types (area, scatter)
  - [ ] Add interactive tooltips
  - [ ] Add annotations

- [ ] ColorUtil enhancements
  - [ ] Add more colormaps
  - [ ] Add color interpolation methods
  - [ ] Add color contrast calculation

### Low Priority
- [ ] notif.js improvements
  - [ ] Add notification positioning options
  - [ ] Add custom icons/styling
  - [ ] Add action buttons in notifications
  - [ ] Add notification history

- [ ] config.js improvements
  - [ ] Add config validation schemas
  - [ ] Add config migration support
  - [ ] Add config import/export UI

## Build & Distribution

### High Priority
- [ ] Set up build process
  - [ ] Bundle for browser use
  - [ ] Minify for production
  - [ ] Generate source maps

- [ ] Package for distribution
  - [ ] Prepare for npm publishing
  - [ ] Add proper package.json metadata
  - [ ] Create CHANGELOG.md

### Medium Priority
- [ ] Set up CI/CD
  - [ ] GitHub Actions for tests
  - [ ] Automated testing on push
  - [ ] Coverage reporting
  - [ ] Automated releases

- [ ] Browser builds
  - [ ] Create UMD bundle
  - [ ] Create ES module bundle
  - [ ] Create separate bundles per module

## Dependencies & Compatibility

### Review & Document
- [ ] Document external dependencies
  - [ ] JSZip for NPZ file support (mentioned in array.js)
  - [ ] Browser API requirements (fetch, clipboard, etc.)

- [ ] Add polyfills if needed
  - [ ] Fetch polyfill for older browsers
  - [ ] URL polyfill
  - [ ] Promise polyfill

- [ ] Node.js compatibility
  - [ ] Test with Node 18, 20, 22
  - [ ] Document minimum Node version

## Maintenance

### Ongoing
- [ ] Keep dependencies updated
- [ ] Monitor issues and PRs
- [ ] Update documentation as needed
- [ ] Add new tests for bug fixes
- [ ] Performance monitoring

## Nice to Have

- [ ] Add TypeScript definitions (.d.ts files)
- [ ] Create interactive playground/demo site
- [ ] Add VS Code extension with snippets
- [ ] Create video tutorials
- [ ] Benchmark against similar libraries
- [ ] Add accessibility (a11y) improvements to DataTable
- [ ] Add internationalization (i18n) support
- [ ] Create Storybook for UI components

## Notes

- Tests are comprehensive but need to be run and verified
- Some features have TODO comments in source code that need attention
- Browser testing is essential before production use
- Consider splitting into separate npm packages if modules are used independently
