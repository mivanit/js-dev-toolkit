# Task 8: DataTable Row Selection

**Priority:** MEDIUM
**Effort:** Medium (3-4 hours)
**Type:** Feature - UI Enhancement
**Dependencies:** Task 6 (keyboard navigation) is complementary

## Status
- [ ] Not Started

## Description
Add row selection functionality to DataTable, allowing users to select single or multiple rows for further actions (export, delete, bulk operations, etc.).

## Goals
- Enable single row selection
- Enable multiple row selection (with Ctrl/Shift)
- Provide API to get selected rows
- Visual indication of selected rows
- Support keyboard selection (if Task 6 is complete)

## Current State
- DataTable displays data with sorting, filtering, pagination
- No row selection mechanism
- Users cannot interact with individual rows beyond viewing

## Checklist

### Selection Modes
- [ ] Implement selection mode configuration
  - [ ] `none` - No selection (default, for backward compatibility)
  - [ ] `single` - Single row selection only
  - [ ] `multiple` - Multiple row selection
  - [ ] Config: `config.selectionMode = 'single' | 'multiple' | 'none'`
- [ ] Add selection state tracking
  - [ ] `this.selectedRows` - Set or array of selected row indices/IDs
  - [ ] Consider using row IDs instead of indices for persistence across filtering/sorting

### Single Selection
- [ ] Click row to select
  - [ ] Click selected row to deselect
  - [ ] Clicking another row deselects previous
  - [ ] Visual highlight on selected row
- [ ] Add checkbox column (optional)
  - [ ] Radio buttons for single selection
  - [ ] Or: No checkbox, just click row

### Multiple Selection
- [ ] Click row to toggle selection
  - [ ] Without modifier: Select only that row (clear others)
  - [ ] Ctrl/Cmd+Click: Toggle single row (keep other selections)
  - [ ] Shift+Click: Select range from last selected to clicked row
- [ ] Add checkbox column
  - [ ] Checkbox in header to select/deselect all (on current page or all pages)
  - [ ] Checkbox in each row
  - [ ] Indeterminate state for "some selected"
- [ ] Select all / Deselect all
  - [ ] Header checkbox functionality
  - [ ] API methods: `selectAll()`, `deselectAll()`
  - [ ] Consider: select all visible rows vs all rows (including filtered)

### Visual Feedback
- [ ] Selected row styling
  - [ ] Background color change
  - [ ] Border or highlight
  - [ ] Contrast with hover state
- [ ] Checkbox styling (if using checkboxes)
  - [ ] Consistent with table design
  - [ ] Clear checked/unchecked states
  - [ ] Indeterminate state for header checkbox
- [ ] Selection count indicator (optional)
  - [ ] Show "3 rows selected" in table footer or header
  - [ ] Clear selection button

### API Methods
- [ ] Getter methods
  - [ ] `getSelectedRows()` - Returns array of selected row data
  - [ ] `getSelectedIndices()` - Returns array of selected row indices
  - [ ] `getSelectedIds()` - Returns array of selected row IDs (if ID field configured)
  - [ ] `isRowSelected(index)` - Check if specific row is selected
- [ ] Setter methods
  - [ ] `selectRow(index)` - Programmatically select a row
  - [ ] `deselectRow(index)` - Programmatically deselect a row
  - [ ] `selectAll()` - Select all rows
  - [ ] `deselectAll()` - Clear all selections
  - [ ] `setSelectedRows(indices)` - Set selection to specific rows
- [ ] Events/Callbacks
  - [ ] `onSelectionChange(selectedRows)` - Called when selection changes
  - [ ] Pass both row data and indices

### Keyboard Support (if Task 6 complete)
- [ ] Space key to toggle selection
  - [ ] Space on focused row toggles selection
- [ ] Ctrl+A to select all
- [ ] Escape to clear selection
- [ ] Shift+Arrow keys to extend selection range
- [ ] Update ARIA attributes
  - [ ] `aria-selected="true"` on selected rows
  - [ ] Announce selection changes to screen readers

### Selection Persistence
- [ ] Handle filtering
  - [ ] Option 1: Clear selection on filter
  - [ ] Option 2: Maintain selection, filter preserves selected rows
  - [ ] Make behavior configurable
- [ ] Handle sorting
  - [ ] Maintain selection when sort changes
  - [ ] Use row IDs/data references, not indices
- [ ] Handle pagination
  - [ ] Selection persists across page changes
  - [ ] Show selection count across all pages
  - [ ] Option to select all visible vs all rows

## Implementation Notes

### Row Identification
Use stable row identifiers instead of indices:
```javascript
// Instead of: this.selectedRows = [0, 2, 5]
// Use: this.selectedRows = new Set(['id_1', 'id_3', 'id_6'])

// If no ID field, use object reference or generate internal ID
if (config.idField) {
  rowId = row[config.idField];
} else {
  rowId = row._internalId || generateId();
}
```

### Range Selection Algorithm
For Shift+Click selection:
```javascript
selectRange(fromIndex, toIndex) {
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  for (let i = start; i <= end; i++) {
    this.selectRow(i);
  }
}
```

### Event Handling
```javascript
handleRowClick(event, rowIndex) {
  if (this.config.selectionMode === 'none') return;

  if (event.shiftKey && this.lastSelectedIndex !== null) {
    // Range selection
    this.selectRange(this.lastSelectedIndex, rowIndex);
  } else if (event.ctrlKey || event.metaKey) {
    // Toggle single row
    this.toggleRow(rowIndex);
  } else {
    // Single selection (clear others)
    this.deselectAll();
    this.selectRow(rowIndex);
  }

  this.lastSelectedIndex = rowIndex;
  this.render();
  this.fireSelectionChange();
}
```

### Example Usage
```javascript
let table = new DataTable(container, {
  data: myData,
  selectionMode: 'multiple',
  idField: 'id',  // Use 'id' field as row identifier
  showCheckboxes: true,
  onSelectionChange: (selectedRows) => {
    console.log('Selected:', selectedRows);
    // Enable/disable bulk action buttons
    document.getElementById('deleteBtn').disabled = selectedRows.length === 0;
  }
});

// Programmatic selection
table.selectRow(0);
table.selectRow(2);
let selected = table.getSelectedRows();
console.log(selected); // [{id: 1, name: 'Alice'}, {id: 3, name: 'Charlie'}]

// Select all
table.selectAll();

// Clear selection
table.deselectAll();
```

## Files to Modify
- `src/table.js` - Add selection logic and UI

## Testing
- [ ] Manual testing
  - [ ] Test single selection mode
  - [ ] Test multiple selection with Ctrl+Click
  - [ ] Test range selection with Shift+Click
  - [ ] Test select all / deselect all
  - [ ] Test selection persistence across sort/filter/pagination
  - [ ] Test keyboard selection (if Task 6 is complete)
  - [ ] Test on touch devices
- [ ] Add automated tests in `tests/test-table.html`
  - [ ] Test selection mode configuration
  - [ ] Test single row selection
  - [ ] Test multiple row selection
  - [ ] Test range selection
  - [ ] Test selectAll() / deselectAll()
  - [ ] Test getSelectedRows() API
  - [ ] Test selection persistence
  - [ ] Test onSelectionChange callback
  - [ ] Simulate click events with modifiers
- [ ] Browser compatibility testing
- [ ] Run `make test` to verify all tests pass

## Success Criteria
- Single and multiple selection modes work correctly
- Visual feedback is clear
- Selection persists correctly across operations
- API methods work as documented
- Keyboard support (if Task 6 complete)
- All tests pass
- Feature documented in README

## Related Items from Original TODO.md
- TODO.md line 149-154: Features / High Priority - DataTable enhancements

## Future Enhancements (Not in This Task)
- Row selection with drag gesture (drag over multiple rows)
- Context menu on selected rows (right-click actions)
- Bulk actions API (delete selected, export selected, etc.)
- Selection styles customization
- Save selection state to localStorage
- Column selection (in addition to row selection)
