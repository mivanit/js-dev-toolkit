# Task 5: DataFrame Enhancements - Advanced Operations

**Priority:** MEDIUM
**Effort:** Large (6-8 hours)
**Type:** Feature Implementation
**Dependencies:** Task 4 (filtering & sorting recommended first)

## Status
- [ ] Not Started

## Description
Implement advanced DataFrame operations including groupby aggregations and merge/join operations, bringing DataFrame closer to pandas-like functionality.

## Goals
Enable more sophisticated data analysis workflows with grouping, aggregation, and combining datasets.

## Current State
- DataFrame has basic data storage, column access, filtering, and sorting (after Task 4)
- No groupby functionality
- No merge/join functionality
- Users cannot easily aggregate data by groups or combine multiple DataFrames

## Checklist

### GroupBy Operations
- [ ] Design GroupBy class/interface
  - [ ] Decide on API: `df.groupby('column')` returns GroupBy object?
  - [ ] Or: `df.groupby('column').sum()` directly?
- [ ] Implement `groupby(columns)` method
  - [ ] Accept single column name or array of columns
  - [ ] Return GroupBy object for chaining
  - [ ] Example: `df.groupby('category')` or `df.groupby(['city', 'year'])`
- [ ] Implement GroupBy aggregation methods
  - [ ] `sum()` - sum numeric columns per group
  - [ ] `mean()` - average numeric columns per group
  - [ ] `count()` - count rows per group
  - [ ] `min()` - minimum values per group
  - [ ] `max()` - maximum values per group
  - [ ] `first()` - first row per group
  - [ ] `last()` - last row per group
- [ ] Implement `agg(aggregations)` method
  - [ ] Custom aggregation functions per column
  - [ ] Example: `df.groupby('city').agg({age: 'mean', count: 'sum'})`
- [ ] Handle edge cases
  - [ ] Empty groups
  - [ ] Null values in grouping columns
  - [ ] Non-numeric columns in numeric aggregations

### Merge/Join Operations
- [ ] Implement `merge(other, options)` method
  - [ ] Left join (default)
  - [ ] Right join
  - [ ] Inner join
  - [ ] Outer join
  - [ ] Join on specific columns: `{on: 'id'}` or `{left_on: 'id', right_on: 'user_id'}`
  - [ ] Handle duplicate column names (suffix strategy)
- [ ] Implement convenience methods
  - [ ] `leftJoin(other, on)` - explicit left join
  - [ ] `innerJoin(other, on)` - explicit inner join
  - [ ] `outerJoin(other, on)` - explicit outer join
- [ ] Handle edge cases
  - [ ] No matching keys
  - [ ] Multiple matches (one-to-many, many-to-many)
  - [ ] Null values in join keys
  - [ ] Column name conflicts

### Helper Methods
- [ ] Implement `unique(column)` method
  - [ ] Get unique values in a column
  - [ ] Returns array of unique values
- [ ] Implement `nunique(column)` method
  - [ ] Count unique values in a column
- [ ] Implement `valuesCounts(column)` method
  - [ ] Return object with value counts
  - [ ] Example: `{apple: 3, banana: 2, orange: 1}`

## Implementation Notes

### GroupBy Design
Consider returning a GroupBy object that can be chained:
```javascript
let grouped = df.groupby('category');
let summed = grouped.sum();
let counted = grouped.count();
```

Or use lazy evaluation where aggregation happens immediately:
```javascript
let result = df.groupby('category').sum();
```

Document the chosen approach clearly.

### Join Algorithm
- Simple nested loop for small datasets
- Hash join for larger datasets (more efficient)
- Document performance characteristics

### Column Naming
When merging DataFrames with overlapping column names:
- Keep join key columns (don't duplicate)
- Add suffix to conflicting columns: `age_x`, `age_y` or `age_left`, `age_right`
- Allow customization of suffix strategy

### Example Usage

```javascript
let sales = new DataFrame([
  {date: '2024-01', product: 'A', amount: 100, region: 'East'},
  {date: '2024-01', product: 'B', amount: 150, region: 'East'},
  {date: '2024-01', product: 'A', amount: 120, region: 'West'},
  {date: '2024-02', product: 'A', amount: 130, region: 'East'},
  {date: '2024-02', product: 'B', amount: 140, region: 'West'}
]);

// GroupBy operations
let byProduct = sales.groupby('product').sum();
// Result: product A: 350, product B: 290

let byMonthProduct = sales.groupby(['date', 'product']).mean();
// Result: grouped by date and product with average amounts

let customAgg = sales.groupby('region').agg({
  amount: 'sum',
  product: 'count'
});
// Result: total amount and count per region

// Merge/Join operations
let products = new DataFrame([
  {product: 'A', name: 'Widget', category: 'Hardware'},
  {product: 'B', name: 'Gadget', category: 'Software'}
]);

let enriched = sales.merge(products, {on: 'product'});
// Adds name and category columns to sales data

let leftJoin = sales.leftJoin(products, 'product');
// Same as above, but more explicit

// Helper methods
let uniqueProducts = sales.unique('product'); // ['A', 'B']
let numProducts = sales.nunique('product');   // 2
let regionCounts = sales.valueCounts('region'); // {East: 3, West: 2}
```

## Files to Modify
- `src/DataFrame.js` - Add groupby, merge, join, and helper methods
- Possibly create `src/GroupBy.js` if GroupBy class is separate

## Testing
- [ ] Add unit tests in `tests/test-DataFrame.html`
  - [ ] Test groupby with single column
  - [ ] Test groupby with multiple columns
  - [ ] Test all aggregation methods (sum, mean, count, min, max, first, last)
  - [ ] Test custom aggregation with agg()
  - [ ] Test groupby with empty groups
  - [ ] Test groupby with null values
  - [ ] Test merge with inner join
  - [ ] Test merge with left join
  - [ ] Test merge with right join
  - [ ] Test merge with outer join
  - [ ] Test merge with no matches
  - [ ] Test merge with multiple matches
  - [ ] Test merge with column name conflicts
  - [ ] Test unique(), nunique(), valueCounts()
  - [ ] Test edge cases (empty DataFrames, single row, etc.)
- [ ] Run `make test` to verify all tests pass
- [ ] Create demo in index.html showing groupby and merge

## Success Criteria
- DataFrame supports groupby with common aggregations
- DataFrame supports merge/join operations with multiple join types
- Operations handle edge cases gracefully
- All tests pass
- Methods are well-documented with JSDoc comments
- Demo shows practical usage examples

## Related Items from Original TODO.md
- TODO.md line 156-161: Features / Medium Priority - DataFrame enhancements

## Future Enhancements (Not in This Task)
- Pivot tables
- Window functions (rolling, expanding)
- Time series resampling
- Performance optimization for large datasets
- SQL-like query interface
