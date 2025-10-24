# Task 7: DataTable Column Reordering

**Priority:** MEDIUM
**Effort:** Medium (3-5 hours)
**Type:** Feature - UI Enhancement
**Dependencies:** None (but Task 6 keyboard navigation complements this)

## Status
- [ ] Not Started

## Description
Add drag-and-drop functionality to allow users to reorder table columns by dragging column headers.

## Goals
- Enable users to customize column order via drag-and-drop
- Persist column order preference (optional)
- Maintain data integrity during reordering
- Provide visual feedback during drag operations

## Current State
- DataTable has fixed column order
- No way to reorder columns without recreating the table
- Column configuration is set at initialization

## Checklist

### Drag and Drop Core Functionality
- [ ] Make column headers draggable
  - [ ] Add `draggable="true"` attribute to header cells
  - [ ] Add drag handle icon or visual indicator
  - [ ] Only header cells should be draggable, not data cells
- [ ] Implement drag event handlers
  - [ ] `dragstart`: Store dragged column information
  - [ ] `dragover`: Prevent default, allow drop
  - [ ] `dragenter`: Visual feedback when over drop target
  - [ ] `dragleave`: Remove visual feedback
  - [ ] `drop`: Reorder columns
  - [ ] `dragend`: Clean up, remove drag state
- [ ] Visual feedback during drag
  - [ ] Highlight drop target column
  - [ ] Show ghost/preview of dragged column
  - [ ] Cursor indication (grabbing)
  - [ ] Opacity change on dragged element

### Column Reordering Logic
- [ ] Update internal column order
  - [ ] Modify `this.columns` array
  - [ ] Maintain column metadata (label, type, filterable, etc.)
- [ ] Re-render table after reorder
  - [ ] Update header row
  - [ ] Update all data rows
  - [ ] Maintain sort and filter state
  - [ ] Maintain pagination position
- [ ] Handle edge cases
  - [ ] Dragging to same position (no-op)
  - [ ] Dragging outside table bounds
  - [ ] Multiple rapid reorders

### User Experience Enhancements
- [ ] Add reorder affordance
  - [ ] Drag handle icon (≡ or ⋮⋮) on header cells
  - [ ] Cursor change on hover (`cursor: grab`)
  - [ ] Tooltip: "Drag to reorder"
- [ ] Smooth animations
  - [ ] Animate column movement (optional, might be jarring)
  - [ ] Or: Instant reorder with no animation
- [ ] Keyboard accessibility (if Task 6 is done)
  - [ ] Ctrl+Shift+Left/Right to move column
  - [ ] Or: Focus column, press M for "Move", use arrows, press Enter

### Configuration & Persistence (Optional)
- [ ] Add config option to enable/disable reordering
  - [ ] `config.allowColumnReorder = true/false`
  - [ ] Show/hide drag handles based on setting
- [ ] Persist column order (optional)
  - [ ] Save to localStorage with table ID
  - [ ] Load saved order on initialization
  - [ ] Provide reset button to default order
- [ ] Callback for order changes
  - [ ] `config.onColumnReorder = (newOrder) => {...}`
  - [ ] Allow parent app to handle persistence

### Data Integrity
- [ ] Ensure data mapping stays correct
  - [ ] Column keys must still map to correct data
  - [ ] Sorting must update with new column order
  - [ ] Filtering must update with new column order
  - [ ] Custom renderers must apply to correct columns
- [ ] Test with various data types
  - [ ] Numbers, strings, dates, booleans
  - [ ] Null/undefined values
  - [ ] Complex nested objects

## Implementation Notes

### HTML5 Drag and Drop API
The native HTML5 Drag and Drop API is powerful but has quirks:
- Must call `event.preventDefault()` in `dragover` handler to allow drop
- Data transfer must be set in `dragstart` and read in `drop`
- Some styles (like opacity) don't apply during drag in all browsers

### Alternative: Mouse Events
For more control, implement with mouse events:
- `mousedown` to start drag
- `mousemove` to update position
- `mouseup` to complete drop
- Requires more code but more cross-browser consistent

Recommend starting with HTML5 API for simplicity.

### Visual Feedback Example
```javascript
// On dragstart
event.dataTransfer.effectAllowed = 'move';
event.target.style.opacity = '0.5';

// On dragenter (drop target)
event.target.style.borderLeft = '3px solid #4CAF50';

// On dragleave
event.target.style.borderLeft = '';

// On dragend (cleanup)
event.target.style.opacity = '1';
```

### Column Reordering Algorithm
```javascript
reorderColumn(fromIndex, toIndex) {
  // Remove column from old position
  const [column] = this.columns.splice(fromIndex, 1);
  // Insert at new position
  this.columns.splice(toIndex, 0, column);
  // Re-render table
  this.render();
}
```

### Example Usage
```javascript
let table = new DataTable(container, {
  data: myData,
  allowColumnReorder: true,
  onColumnReorder: (newColumnOrder) => {
    console.log('New column order:', newColumnOrder);
    // Save to localStorage
    localStorage.setItem('tableColumnOrder', JSON.stringify(newColumnOrder));
  }
});
```

## Files to Modify
- `src/table.js` - Add drag-and-drop handlers and reordering logic

## Testing
- [ ] Manual testing
  - [ ] Drag columns to different positions
  - [ ] Drag to first position
  - [ ] Drag to last position
  - [ ] Drag multiple times in succession
  - [ ] Verify data stays with correct columns
  - [ ] Test with sorted data
  - [ ] Test with filtered data
  - [ ] Test drag cancellation (drag outside table)
- [ ] Add automated tests in `tests/test-table.html`
  - [ ] Test reorderColumn() method
  - [ ] Test column order updates correctly
  - [ ] Test data integrity after reorder
  - [ ] Test sort/filter state preserved
  - [ ] Simulate drag and drop events
- [ ] Browser compatibility
  - [ ] Test in Chrome, Firefox, Safari
  - [ ] Test on touch devices (mobile/tablet)
- [ ] Run `make test` to verify all tests pass

## Success Criteria
- Users can drag column headers to reorder columns
- Visual feedback during drag is clear
- Data integrity maintained after reorder
- Sort and filter states preserved
- Configuration options work correctly
- All tests pass
- Feature documented in README

## Related Items from Original TODO.md
- TODO.md line 149-154: Features / High Priority - DataTable enhancements

## Future Enhancements (Not in This Task)
- Touch support for mobile devices (touch events)
- Column hiding/showing
- Column resizing (separate from reordering)
- Column grouping (group related columns)
- Save column layout per user (server-side persistence)
- Undo/redo for column operations
