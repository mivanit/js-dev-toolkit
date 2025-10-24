# TODO: Refactor DataTable to Use DataFrame

## Overview
Refactor `DataTable` class to internally use `DataFrame` for data operations, eliminating code duplication and leveraging DataFrame's tested filtering and sorting capabilities.

## Problem Statement

**Code Duplication:** DataTable (src/table.js) currently implements its own filtering and sorting logic (lines 592-662) that duplicates functionality now available in DataFrame:
- DataFrame has `filter()`, `filterBy()`, `sort()`, `sortBy()`
- DataTable manually implements filtering with string matching, wildcards, numeric operators -- we want to preserve all existing filter types, and preserve custom filter functions from column config
- DataTable manually implements sorting with null handling and custom comparators
- Both handle null values, type coercion, and localeCompare the same way

## Current Architecture

### DataTable Current Flow
```
User Input → DataTable.handleFilter/handleSort
           → DataTable.applyFiltersAndSort (manual filtering/sorting)
           → this.filteredData (plain array)
           → DataTable.getPageData (pagination)
           → DataTable.render
```

### Proposed Architecture
```
User Input → DataTable.handleFilter/handleSort
           → Convert filters to DataFrame predicates
           → DataFrame.filter().sort() (immutable operations)
           → this.df (DataFrame instance)
           → DataTable.getPageData (from df.data)
           → DataTable.render
```

## Implementation Plan

### Phase 1: Internal DataFrame Storage
**Goal:** Store data as DataFrame internally without changing public API

- [ ] Add DataFrame as internal storage
  - [ ] Store `this.df = new DataFrame(data)` instead of `this.data = data`
  - [ ] Keep `this.data` as getter: `get data() { return this.df.data; }`
  - [ ] Update constructor to create DataFrame from input data

- [ ] Update data manipulation methods
  - [ ] `setData(data)`: Create new DataFrame
  - [ ] `addRow(row)`: Use DataFrame operations or recreate
  - [ ] Maintain backward compatibility with existing API

### Phase 2: Use DataFrame for Filtering
**Goal:** Replace manual filtering with DataFrame methods

- [ ] Refactor `applyFiltersAndSort()` to use DataFrame.filter()
  - [ ] Convert DataTable filters to DataFrame filter predicates
  - [ ] Handle numeric operators (>, <, >=, <=, ==, !=) in predicate functions
  - [ ] Handle string matching (substring, wildcards) in predicate functions
  - [ ] Handle custom filter functions from column config

- [ ] Map filter types to DataFrame operations
  - [ ] String filters → `df.filter(row => /* match logic */)`
  - [ ] Numeric filters → `df.filter(row => /* operator logic */)`
  - [ ] Wildcard filters → `df.filter(row => /* regex logic */)`
  - [ ] Custom filters → `df.filter(row => customFn(row[col]))`

### Phase 3: Use DataFrame for Sorting
**Goal:** Replace manual sorting with DataFrame methods

- [ ] Refactor sorting to use DataFrame.sort()/sortBy()
  - [ ] Simple column sort → `df.sort(columnKey, ascending)`
  - [ ] Custom sort functions → `df.sortBy(compareFn)`
  - [ ] Maintain custom sortFunction from column config

- [ ] Handle DataTable-specific features
  - [ ] Nested key access (`getNestedValue`) already handled by DataFrame
  - [ ] Custom sort transformations can wrap DataFrame.sortBy()
  - [ ] Three-state sort (asc → desc → none) UI logic stays in DataTable

### Phase 4: Simplify Data Pipeline
**Goal:** Leverage immutable DataFrame operations

- [ ] Chain DataFrame operations
  - [ ] `this.df.filter(...).sort(...) → new DataFrame`
  - [ ] Store result as `this.displayDf`
  - [ ] Update `getPageData()` to paginate from `this.displayDf.data`

- [ ] Remove redundant code
  - [ ] Delete manual filter logic (lines 592-627)
  - [ ] Delete manual sort logic (lines 629-658)
  - [ ] Keep only DataFrame operation calls
  - [ ] Simplify `applyFiltersAndSort()` to ~20 lines

### Phase 5: Optimization & Edge Cases
**Goal:** Maintain or improve performance

- [ ] Performance considerations
  - [ ] DataFrame operations return new instances (immutable)
  - [ ] Acceptable for typical table sizes (<10k rows)
  - [ ] Consider caching if needed for large datasets

- [ ] Edge cases to test
  - [ ] Empty data → empty DataFrame
  - [ ] Null/undefined values in filters/sorts
  - [ ] Mixed data types in columns
  - [ ] Custom filter/sort functions
  - [ ] Nested keys (e.g., "stats.entropy")
  - [ ] Pagination after filtering

### Phase 6: Update Tests & Documentation
**Goal:** Ensure refactoring doesn't break functionality

- [ ] Test coverage
  - [ ] Verify all existing DataTable tests pass
  - [ ] Add tests for DataFrame integration
  - [ ] Test that filters/sorts produce identical results

- [ ] Documentation
  - [ ] Update inline comments to reference DataFrame
  - [ ] Note that filtering/sorting leverage DataFrame
  - [ ] Document any breaking changes (if any)

### other:

- [ ] Data export
  - [ ] Use DataFrame's CSV/JSONL export

## Technical Details

### Filter Conversion Strategy

**Current DataTable filter format:**
```javascript
this.filters[columnId] = {
  key: columnKey,
  value: filterValue,
  type: 'string' | 'number',
  valid: true/false,
  customFilter: fn | null
}
```

**Convert to DataFrame predicate:**
```javascript
// Numeric filter: ">50"
df.filter(row => {
  const val = parseFloat(row[columnKey]);
  return !isNaN(val) && val > 50;
});

// String filter: "foo*"
df.filter(row => {
  const val = String(row[columnKey]).toLowerCase();
  return /^foo.*$/.test(val);
});

// Custom filter
df.filter(row => customFn(row[columnKey]));
```

**Chain multiple filters:**
```javascript
let result = this.df;
for (const [columnId, filter] of Object.entries(this.filters)) {
  if (!filter.valid) continue;
  result = result.filter(createPredicateFromFilter(filter));
}
return result;
```

### Sort Conversion Strategy

**Current DataTable sort:**
```javascript
this.sortColumnId = 'age';
this.sortDirection = 'asc' | 'desc' | null;
```

**Convert to DataFrame operation:**
```javascript
// Simple sort
const ascending = this.sortDirection === 'asc';
df.sort(this.sortColumnId, ascending);

// Custom sort with transform
df.sortBy((a, b) => {
  const aVal = customTransform(a[columnKey]);
  const bVal = customTransform(b[columnKey]);
  // comparison logic
});
```

## Potential Issues & Solutions

### Issue 1: Nested Keys
**Problem:** DataTable supports nested keys like "stats.entropy"
**Solution:** DataFrame doesn't support nested keys natively
- Option A: Add nested key support to DataFrame (better long-term)
- Option B: Flatten data before passing to DataFrame
- Option C: Keep nested key logic in DataTable predicate functions

**Recommendation:** Option C for now (minimal change), consider Option A later

### Issue 2: Custom Filter/Sort Functions
**Problem:** DataTable columns can have custom `filterFunction` and `sortFunction`
**Solution:** These work with DataFrame's predicate-based approach
```javascript
// Custom filter function
if (col.filterFunction) {
  const customFilter = col.filterFunction(filterValue);
  df.filter(row => customFilter(row[col.key]));
}

// Custom sort function
if (col.sortFunction) {
  df.sortBy((a, b) => {
    const aVal = col.sortFunction(a[col.key], a);
    const bVal = col.sortFunction(b[col.key], b);
    return compareValues(aVal, bVal);
  });
}
```

### Issue 3: Performance
**Problem:** DataFrame creates new instances (immutable), might be slower
**Solution:**
- Acceptable trade-off for cleaner code and better maintainability
- Most tables have <1000 rows where performance difference is negligible
- Can optimize later if needed (caching, memoization)

### Issue 4: Column ID vs Key
**Problem:** DataTable uses both `col.id` and `col.key`, DataFrame only uses keys
**Solution:**
- DataTable uses ID for UI state, key for data access
- Convert ID to key before DataFrame operations: `const key = this.columns.find(c => c.id === columnId)?.key`
- This mapping already exists in current code

## Success Criteria

- [ ] All existing DataTable tests pass
- [ ] Filtering behavior is identical to before refactoring
- [ ] Sorting behavior is identical to before refactoring
- [ ] Public API remains unchanged (no breaking changes)
- [ ] ~70 lines of code removed from DataTable
- [ ] Code is more maintainable and easier to understand
- [ ] Performance is acceptable (no major degradation)

## Migration Path

### For Users
**No breaking changes allowed!** DataTable API remains the same:
```javascript
// Before and after work identically
new DataTable('#container', {
  data: [...],
  columns: [...]
});
```

### For Developers
Internal refactoring only. Key changes:
- `this.data` becomes `this.df.data` internally
- `this.filteredData` becomes `this.displayDf.data`
- Filter/sort logic replaced with DataFrame method calls


## Future Enhancements (Out of Scope)

Once DataTable uses DataFrame internally, new features become easier:

- [ ] Add DataFrame methods to DataTable public API
  - [ ] `table.getDataFrame()` - export current filtered/sorted data as DataFrame
  - [ ] `table.fromDataFrame(df)` - load DataFrame directly

- [ ] Advanced filtering
  - [ ] Multi-column filters with AND/OR logic
  - [ ] Date range filters
  - [ ] Regex filters

- [ ] Advanced sorting
  - [ ] Multi-column sort (sort by A, then B)
  - [ ] Custom sort orders (e.g., "high, medium, low")

- [ ] Data transformations
  - [ ] Aggregations (groupBy, sum, avg)
  - [ ] Column computations
  - [ ] Data pivoting

## References

- DataFrame implementation: `src/DataFrame.js`
- DataFrame tests: `tests/test-DataFrame.html`
- DataTable implementation: `src/table.js` (DataTable used to be src/DataTable.js)
- TASK_4 completion: `docs/todos/TASK_4.md`

## Notes

- This refactoring **must not** change the UI or user-facing behavior
- Focus is on internal code quality and maintainability
- DataFrame's immutable operations are a feature, not a bug. make sure the original data is not mutated, so that when we clear filters/sorts we can revert to the original data easily.
- Consider this a "refactoring" not a "rewrite" - minimize changes
