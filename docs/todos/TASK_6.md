# Task 6: DataTable Keyboard Navigation

**Priority:** MEDIUM-HIGH
**Effort:** Medium (3-4 hours)
**Type:** Feature - Accessibility Enhancement
**Dependencies:** None

## Status
- [ ] Not Started

## Description
Add comprehensive keyboard navigation to the DataTable component to improve accessibility and user experience for keyboard users.

## Goals
- Enable full keyboard navigation of table cells and controls
- Follow standard accessibility patterns (WCAG guidelines)
- Improve usability for power users
- Make DataTable accessible to screen reader users

## Current State
- DataTable supports mouse interaction (sorting, filtering, pagination)
- No keyboard navigation implemented
- Tab navigation only goes through buttons and input fields
- Cannot navigate between table cells with keyboard

## Checklist

### Core Navigation
- [ ] Arrow key navigation
  - [ ] Arrow Up/Down: Navigate between rows
  - [ ] Arrow Left/Right: Navigate between columns
  - [ ] Handle boundaries (don't move past first/last row or column)
  - [ ] Visual indication of focused cell (highlight/outline)
- [ ] Tab key behavior
  - [ ] Tab: Move to next interactive element (filter inputs, buttons)
  - [ ] Shift+Tab: Move to previous interactive element
  - [ ] Enter table navigation mode with a specific key combination?
- [ ] Home/End keys
  - [ ] Home: Jump to first column in current row
  - [ ] End: Jump to last column in current row
  - [ ] Ctrl+Home: Jump to first cell in table (top-left)
  - [ ] Ctrl+End: Jump to last cell in table (bottom-right)
- [ ] Page Up/Down keys
  - [ ] Page Up: Move up one page of rows
  - [ ] Page Down: Move down one page of rows
  - [ ] Or: Go to previous/next pagination page

### Sorting & Filtering
- [ ] Sort activation from keyboard
  - [ ] Enter or Space on column header to toggle sort
  - [ ] Visual indication of sortable columns (when focused)
- [ ] Filter input access
  - [ ] Navigate to filter inputs with keyboard
  - [ ] Escape to clear filter or exit filter mode
  - [ ] Enter to apply filter

### Pagination Controls
- [ ] Navigate pagination buttons with keyboard
  - [ ] Tab to reach pagination controls
  - [ ] Enter/Space to activate buttons
  - [ ] Arrow keys to navigate between page numbers?
- [ ] Keyboard shortcuts for pagination
  - [ ] Ctrl+Left: Previous page
  - [ ] Ctrl+Right: Next page

### Accessibility Features
- [ ] Add ARIA labels and roles
  - [ ] `role="grid"` for table
  - [ ] `role="gridcell"` for cells
  - [ ] `role="columnheader"` for headers
  - [ ] `aria-sort` attribute for sorted columns
  - [ ] `aria-label` for buttons and controls
  - [ ] `aria-live` region for status updates
- [ ] Focus management
  - [ ] Maintain focus position when data updates
  - [ ] Restore focus after filtering/sorting
  - [ ] Trap focus within modal controls if any
- [ ] Screen reader announcements
  - [ ] Announce current cell position: "Row 3, Column 2, Name: Alice"
  - [ ] Announce sort changes: "Sorted by Age, Descending"
  - [ ] Announce page changes: "Page 2 of 5"
  - [ ] Announce filter applications: "Filtered to 10 rows"

### Visual Feedback
- [ ] Focus styles for keyboard users
  - [ ] Clear outline/border on focused cell
  - [ ] Different style from mouse hover
  - [ ] High contrast for visibility
- [ ] Focus indicator in headers and controls
  - [ ] Visible focus on buttons, inputs, headers
- [ ] Mode indicator (optional)
  - [ ] Show "Navigation Mode" vs "Edit Mode" if applicable

## Implementation Notes

### Focus Management Strategy
Options for handling focus:
1. **Roving tabindex**: Only one cell has `tabindex="0"`, others have `tabindex="-1"`. Use JavaScript to move tabindex as user navigates.
2. **Focus trap**: Table has `tabindex="0"`, handle all navigation with JavaScript, use CSS for visual focus.

Roving tabindex is the recommended approach for grid navigation.

### Keyboard Event Handling
```javascript
handleKeyDown(event) {
  const {key, ctrlKey, shiftKey} = event;

  switch(key) {
    case 'ArrowUp':
      event.preventDefault();
      this.moveFocusUp();
      break;
    case 'ArrowDown':
      event.preventDefault();
      this.moveFocusDown();
      break;
    // ... more keys
  }
}
```

### Focus State Tracking
Keep track of:
- Current focused cell (row index, column index)
- Whether focus is in header, body, or footer
- Whether focus is in filter inputs or pagination controls

### Pagination Considerations
When changing pages:
- Maintain relative focus position (e.g., if focused on row 3, stay on row 3 of new page)
- Or: Reset focus to first cell of new page
- Document the behavior chosen

### Example Usage
After implementation, users should be able to:
```
1. Tab to table
2. Press Enter to enter navigation mode (if needed)
3. Use arrow keys to navigate cells
4. Press Space/Enter on header to sort
5. Tab to filter input, type filter, press Enter
6. Tab to pagination buttons
7. Press Escape to exit table navigation
```

## Files to Modify
- `src/table.js` - Add keyboard event handlers and ARIA attributes

## Testing
- [ ] Manual testing with keyboard only (no mouse)
  - [ ] Navigate all cells with arrow keys
  - [ ] Activate sort with keyboard
  - [ ] Use filters with keyboard
  - [ ] Navigate pagination with keyboard
  - [ ] Test Home/End/Page Up/Down keys
- [ ] Screen reader testing
  - [ ] Test with NVDA (Windows) or VoiceOver (Mac)
  - [ ] Verify announcements are clear and helpful
  - [ ] Ensure all controls are accessible
- [ ] Add automated tests in `tests/test-table.html`
  - [ ] Test keyboard event handlers
  - [ ] Test focus movement logic
  - [ ] Test ARIA attributes are present
  - [ ] Simulate key presses and verify behavior
- [ ] Browser compatibility
  - [ ] Test in Chrome, Firefox, Safari
  - [ ] Verify keyboard shortcuts don't conflict with browser shortcuts
- [ ] Run `make test` to verify all tests pass

## Success Criteria
- Full keyboard navigation without mouse
- All interactive elements accessible via keyboard
- Proper ARIA labels and roles
- Screen reader compatibility
- Visual feedback for focused elements
- No keyboard traps (user can always exit)
- Tests pass
- Documentation updated with keyboard shortcuts

## Related Items from Original TODO.md
- TODO.md line 149-154: Features / High Priority - DataTable enhancements
- TODO.md line 198: Nice to Have - Accessibility improvements

## References
- [ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WCAG 2.1 Keyboard Accessible](https://www.w3.org/WAI/WCAG21/quickref/#keyboard-accessible)

## Future Enhancements (Not in This Task)
- Cell editing with keyboard
- Multi-cell selection with Shift+Arrow keys
- Find-in-table functionality (Ctrl+F within table)
- Customizable keyboard shortcuts
