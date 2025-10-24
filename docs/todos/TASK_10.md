# Task 10: Add Missing Unit Test Coverage - CSV & Miscellaneous

**Priority:** MEDIUM
**Effort:** Medium (3-5 hours)
**Type:** Testing - General Coverage Expansion
**Dependencies:** None

## Status
- [ ] Not Started

## Description
Add test coverage for various untested functionality across multiple modules: DataFrame CSV parsing, table.js advanced features, config.js async operations, and sparklines.js configurations.

## Goals
- Improve overall test coverage
- Test edge cases and error conditions
- Test features that are currently used but not explicitly tested
- Ensure robustness of the toolkit

## Current State
According to TODO.md, these areas lack test coverage:
- DataFrame CSV parsing with quote escaping
- DataTable custom renderers, filters, sort functions
- DataTable column resizing behavior
- DataTable pagination edge cases
- Config.js URL debouncing, async flow, array parameters
- Sparklines axis configurations

## Checklist

### DataFrame.js - CSV Parsing
- [ ] Test CSV parsing with proper quote escaping
  - [ ] Fields with quotes: `"John ""The Boss"" Smith"`
  - [ ] Fields with commas: `"Smith, John"`
  - [ ] Fields with newlines: `"Multi\nline\ntext"`
  - [ ] Mixed escaping scenarios
  - [ ] Empty fields: `field1,,field3`
  - [ ] Trailing/leading whitespace
- [ ] Test from_csv() method
  - [ ] Parse valid CSV strings
  - [ ] Handle header row
  - [ ] Handle no header (column indices)
  - [ ] Handle empty CSV
  - [ ] Handle malformed CSV (error handling)
- [ ] Test to_csv() method
  - [ ] Export with proper escaping
  - [ ] Export with custom delimiter
  - [ ] Export with/without header row
  - [ ] Round-trip test: CSV → DataFrame → CSV

### table.js - Custom Functions
- [ ] Test custom column renderers
  - [ ] Render function receives correct arguments (value, row, column)
  - [ ] Return HTML string or DOM element
  - [ ] Test with various data types
  - [ ] Test error handling (renderer throws)
- [ ] Test custom filter functions
  - [ ] Filter function receives correct arguments (value, filterValue)
  - [ ] Return boolean for include/exclude
  - [ ] Test with various filter values
  - [ ] Interaction with built-in filters
- [ ] Test custom sort functions
  - [ ] Comparator receives correct arguments (a, b)
  - [ ] Return correct comparison values (-1, 0, 1)
  - [ ] Test with various data types
  - [ ] Interaction with built-in sort

### table.js - Column Resizing
- [ ] Test column resizing behavior
  - [ ] Minimum width enforcement
  - [ ] Maximum width (if any)
  - [ ] Resize handle interaction
  - [ ] Resize updates correctly
  - [ ] Persistence of widths (if implemented)
- [ ] Test edge cases
  - [ ] Resize to very small width
  - [ ] Resize to very large width
  - [ ] Resize with content overflow

### table.js - Pagination Edge Cases
- [ ] Test page validation
  - [ ] Navigate to page 0 or negative (should prevent)
  - [ ] Navigate past last page (should prevent)
  - [ ] Set page size larger than total rows
  - [ ] Set page size to 0 or negative (should prevent or use default)
- [ ] Test pagination state
  - [ ] Current page after filtering (reset to page 1?)
  - [ ] Current page after sorting (maintain or reset?)
  - [ ] Page size change (maintain current row or reset?)
- [ ] Test pagination with dynamic data
  - [ ] Add rows (pagination updates?)
  - [ ] Remove rows (adjust current page?)
  - [ ] Empty data (handle gracefully)

### config.js - URL Update Debouncing
- [ ] Test URL update debouncing
  - [ ] Multiple rapid config changes
  - [ ] Only one URL update after delay
  - [ ] Verify DEBOUNCE_DELAY is respected
  - [ ] Test cancellation of pending updates
- [ ] Test URL synchronization
  - [ ] Config change → URL updates
  - [ ] URL doesn't update for skip paths
  - [ ] URL doesn't update for comparison skip keys

### config.js - Async Flow
- [ ] Test full getConfig() async flow with fetch
  - [ ] Mock fetch to return config.json
  - [ ] Merge with defaults
  - [ ] Merge with INLINE_CONFIG
  - [ ] Apply URL parameters (highest priority)
  - [ ] Test with missing config.json (404)
  - [ ] Test with invalid JSON
  - [ ] Test with network error
- [ ] Test config loading priority
  - [ ] Default < Inline < File < URL
  - [ ] Verify deep merging works correctly
  - [ ] Test nested config overrides

### config.js - Array Parameters
- [ ] Test array parameter parsing from URL
  - [ ] Tilde-separated values: `?tags=foo~bar~baz`
  - [ ] Parse to array: `['foo', 'bar', 'baz']`
  - [ ] Empty array: `?tags=`
  - [ ] Single value: `?tags=foo` → `['foo']`
  - [ ] Special characters in array values
  - [ ] Array of numbers vs strings

### sparklines.js - Axis Configurations
- [ ] Test various axis configurations
  - [ ] Show/hide axes
  - [ ] Custom axis ranges (min, max)
  - [ ] Automatic vs manual scaling
  - [ ] Axis labels and ticks
  - [ ] Logarithmic scales (if supported)
- [ ] Test edge cases
  - [ ] All zero values
  - [ ] All same values
  - [ ] Negative values
  - [ ] Very large/small values (scientific notation)
  - [ ] NaN/Infinity handling

### notif.js - Animation and Timing
- [ ] Test animation and positioning logic
  - [ ] Notification appears with animation
  - [ ] Notification disappears after timeout
  - [ ] Multiple notifications stack correctly
  - [ ] Position options (top/bottom, left/right/center)
- [ ] Test timing
  - [ ] Custom duration respected
  - [ ] Persistent notifications (no auto-dismiss)
  - [ ] Manual dismissal works
  - [ ] Queue management (max notifications)

## Implementation Notes

### Testing Async Functions
For config.js async tests, use async/await in test framework:
```javascript
test('getConfig loads from fetch', async () => {
  // Mock fetch
  window.fetch = async (url) => ({
    ok: true,
    json: async () => ({key: 'value'})
  });

  const config = await getConfig();
  assert(config.key === 'value', 'Config loaded from fetch');
});
```

### Testing Debouncing
Use timers or wait for debounce delay:
```javascript
test('URL update debouncing', async () => {
  setConfig('key1', 'value1');
  setConfig('key2', 'value2');
  setConfig('key3', 'value3');

  // Wait for debounce delay + buffer
  await new Promise(resolve => setTimeout(resolve, 600));

  // Check URL was only updated once
  const url = new URL(window.location.href);
  assert(url.searchParams.get('key3') === 'value3', 'URL updated');
});
```

### Testing Custom Functions
Provide simple test implementations:
```javascript
test('custom column renderer', () => {
  const table = new DataTable(container, {
    data: [{age: 25}],
    columns: [{
      key: 'age',
      render: (value) => `<b>${value} years</b>`
    }]
  });

  const cell = table.container.querySelector('td');
  assert(cell.innerHTML.includes('<b>25 years</b>'), 'Renderer applied');
});
```

## Files to Modify
- `tests/test-DataFrame.html` - Add CSV parsing tests
- `tests/test-table.html` - Add custom function, resize, pagination tests
- `tests/test-config.html` - Add debouncing, async, array parameter tests
- `tests/test-sparklines.html` - Add axis configuration tests
- `tests/test-notif.html` - Add animation and timing tests

## Testing
- [ ] Run all new tests locally
- [ ] Verify tests are independent (don't affect each other)
- [ ] Check test coverage increased
- [ ] Run `make test` to verify all tests pass
- [ ] Ensure no console errors or warnings

## Success Criteria
- All listed functionality has test coverage
- Tests cover both happy paths and edge cases
- All tests pass
- Test suite is maintainable and well-organized
- Code coverage improved significantly

## Related Items from Original TODO.md
- TODO.md line 36-48: Testing / High Priority - Add missing test coverage
- TODO.md line 40-48: Specific untested features listed

## Future Testing Improvements (Not in This Task)
- Add code coverage reporting tool
- Set up coverage thresholds
- Add performance benchmarking tests
- Add visual regression tests (screenshots)
- Integration tests between modules
