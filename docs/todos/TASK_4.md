# Task 4: DataFrame Enhancements - Filtering & Sorting

## Description
Add filtering and sorting capabilities to the DataFrame class to enable basic data manipulation operations.

## Goals
Enable users to filter rows based on conditions and sort data by columns, making DataFrame more useful for data analysis workflows.

## Current State
- DataFrame has basic data storage and column access
- No filtering methods exist
- No sorting methods exist
- Users must manually manipulate data arrays

## Checklist

### Filtering Methods
- [ ] Implement `filter(predicate)` method
  - [ ] Takes a function that receives a row and returns boolean
  - [ ] Returns new DataFrame with filtered rows
  - [ ] Preserves column information
  - [ ] Example: `df.filter(row => row.age > 18)`
- [ ] Implement `filterBy(column, value)` convenience method
  - [ ] Filter rows where column equals value
  - [ ] Returns new DataFrame
  - [ ] Example: `df.filterBy('status', 'active')`
- [ ] Implement `filterBy(column, predicate)` overload
  - [ ] Filter rows where predicate(row[column]) is true
  - [ ] Example: `df.filterBy('age', age => age > 18)`

### Sorting Methods
- [ ] Implement `sort(column, ascending=true)` method
  - [ ] Sort by single column
  - [ ] Returns new DataFrame (immutable)
  - [ ] Handle null/undefined values
  - [ ] Support ascending and descending order
  - [ ] Example: `df.sort('age', false)` for descending
- [ ] Implement `sortBy(compareFn)` method
  - [ ] Custom comparison function for complex sorting
  - [ ] Returns new DataFrame
  - [ ] Example: `df.sortBy((a, b) => a.age - b.age)`

### Helper Methods
- [ ] Implement `clone()` method
  - [ ] Deep copy of DataFrame
  - [ ] Useful for immutable operations
- [ ] Update existing methods to use filter internally if beneficial

## Implementation Notes

for filtering/sorting, return new Dataframes to keep immutability

### Null Handling
Sorting should handle null/undefined values gracefully:
- Place nulls at end for sorting
- when filtering, user figures out how to handle nulls via predicate

### Performance Considerations
- Use native JavaScript array methods where possible
- Document performance characteristics (O(n), O(n log n), etc.)

### Example Usage
```javascript
let df = new DataFrame([
  {name: 'Alice', age: 30, city: 'NYC'},
  {name: 'Bob', age: 25, city: 'LA'},
  {name: 'Charlie', age: 35, city: 'NYC'},
  {name: 'David', age: 25, city: 'SF'}
]);

// Filtering
let adults = df.filter(row => row.age >= 30);
// Result: Alice, Charlie

let nycOnly = df.filterBy('city', 'NYC');
// Result: Alice, Charlie

let youngAdults = df.filterBy('age', age => age >= 25 && age < 30);
// Result: Bob, David

// Sorting
let byAge = df.sort('age');
// Result: Bob(25), David(25), Alice(30), Charlie(35)

let byAgeDesc = df.sort('age', false);
// Result: Charlie(35), Alice(30), Bob(25), David(25)

let custom = df.sortBy((a, b) => {
  // Sort by city, then by age
  if (a.city !== b.city) return a.city.localeCompare(b.city);
  return a.age - b.age;
});
```

## Files to Modify
- `src/DataFrame.js` - Add filtering and sorting methods

## Testing
- [ ] Add unit tests in `tests/test-DataFrame.html`
  - [ ] Test filter with various predicates
  - [ ] Test filterBy with value matching
  - [ ] Test filterBy with predicate function
  - [ ] Test filter with empty results
  - [ ] Test filter with all rows matching
  - [ ] Test sort ascending
  - [ ] Test sort descending
  - [ ] Test sort with null values
  - [ ] Test sort with equal values
  - [ ] Test sortBy with custom comparator
  - [ ] Test multi-column sort (if implemented)
  - [ ] Test that original DataFrame is not mutated
- [ ] Run `make test` to verify all tests pass
- [ ] Test in index.html demo

## Success Criteria
- DataFrame has working filter and sort methods
- Operations are immutable (return new DataFrames)
- Null values are handled gracefully
- All tests pass
- Methods are well-documented with JSDoc comments

## Related Items from Original TODO.md
- TODO.md line 156-161: Features / Medium Priority - DataFrame enhancements

## Future Enhancements (Not in This Task)
- Chaining operations: `df.filter(...).sort(...).head(10)`
- Index preservation/reset options
- Performance optimizations for large datasets
- Query language (SQL-like or pandas-like)
