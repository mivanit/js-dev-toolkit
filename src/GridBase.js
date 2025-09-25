// grid-wrapper.js - Base RevoGrid functionality with advanced filtering

class GridBase {
    constructor(container, config = {}) {
        this.container = container;
        this.originalData = [];
        this.filters = {};
        this.grid = null;
        this.columns = config.columns || [];
        this.data = config.data || [];

        this.init();
    }

    init() {
        this.originalData = [...this.data];
        this.createFilterRow();
        this.createGrid();
    }

    // Parse numeric filter expression
    parseNumericFilter(value) {
        const trimmed = value.trim();
        if (!trimmed) return null;

        const match = trimmed.match(/^(==|>=|<=|>|<)?\s*(-?\d+\.?\d*)$/);
        if (!match) return { valid: false };

        const operator = match[1] || '==';
        const number = parseFloat(match[2]);

        if (isNaN(number)) return { valid: false };

        return {
            valid: true,
            operator,
            value: number
        };
    }

    // Apply numeric filter
    applyNumericFilter(cellValue, filter) {
        if (!filter || !filter.valid) return true;

        const value = parseFloat(cellValue);
        if (isNaN(value)) return false;

        switch (filter.operator) {
            case '==': return value === filter.value;
            case '>': return value > filter.value;
            case '<': return value < filter.value;
            case '>=': return value >= filter.value;
            case '<=': return value <= filter.value;
            default: return true;
        }
    }

    // Convert glob pattern to regex
    globToRegex(glob) {
        let pattern = '';
        let i = 0;
        while (i < glob.length) {
            const char = glob[i];
            if (char === '\\' && i + 1 < glob.length) {
                const nextChar = glob[i + 1];
                if (nextChar === '*') {
                    pattern += '\\*';
                    i += 2;
                } else {
                    pattern += '\\\\';
                    i++;
                }
            } else if (char === '*') {
                pattern += '.*';
                i++;
            } else {
                pattern += char.replace(/[.+?^${}()|[\]]/g, '\\$&');
                i++;
            }
        }
        return new RegExp('^' + pattern + '$', 'i');
    }

    // Apply string filter
    applyStringFilter(cellValue, filterValue) {
        if (!filterValue) return true;
        if (cellValue == null) return false;

        const str = cellValue.toString();

        if (filterValue.includes('*') && !filterValue.includes('\\*')) {
            try {
                const regex = this.globToRegex(filterValue);
                return regex.test(str);
            } catch (e) {
                return false;
            }
        } else {
            const searchStr = filterValue.replace(/\\\*/g, '*');
            return str.toLowerCase().includes(searchStr.toLowerCase());
        }
    }

    // Apply all filters
    applyFilters() {
        const filtered = this.originalData.filter(row => {
            for (const [prop, filterData] of Object.entries(this.filters)) {
                if (!filterData.value) continue;

                const cellValue = row[prop];

                if (filterData.type === 'numeric') {
                    if (!this.applyNumericFilter(cellValue, filterData.parsed)) {
                        return false;
                    }
                } else {
                    if (!this.applyStringFilter(cellValue, filterData.value)) {
                        return false;
                    }
                }
            }
            return true;
        });

        if (this.grid) {
            this.grid.source = filtered;
        }
    }

    // Handle filter input
    handleFilterInput(prop, type, input) {
        const value = input.value;

        if (type === 'numeric') {
            const parsed = this.parseNumericFilter(value);
            this.filters[prop] = { value, type, parsed };
            if (value && !parsed.valid) {
                input.style.backgroundColor = '#ffe0e0';
            } else {
                input.style.backgroundColor = '';
            }
        } else {
            this.filters[prop] = { value, type };
            input.style.backgroundColor = '';
        }

        this.applyFilters();
    }

    // Clear individual filter
    clearFilter(prop, input) {
        input.value = '';
        delete this.filters[prop];
        input.style.backgroundColor = '';
        this.applyFilters();
    }

    // Clear all filters
    clearAllFilters() {
        this.filters = {};
        this.container.querySelectorAll('.rg-filter-input').forEach(input => {
            input.value = '';
            input.style.backgroundColor = '';
        });
        this.applyFilters();
    }

    // Create filter row
    createFilterRow() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'rg-filter-container';

        const filterRow = document.createElement('div');
        filterRow.className = 'rg-filter-row';

        // Add space for row headers if enabled
        const rowHeaderSpace = document.createElement('div');
        rowHeaderSpace.className = 'rg-row-header-space';
        filterRow.appendChild(rowHeaderSpace);

        // Create filter for each column
        this.columns.forEach(col => {
            const container = document.createElement('div');
            container.className = 'rg-filter-cell';
            container.style.width = col.size + 'px';

            const input = document.createElement('input');
            input.className = 'rg-filter-input';
            input.placeholder = col.columnType === 'numeric' ? 'e.g. >50' : 'text or *glob*';

            const clearBtn = document.createElement('button');
            clearBtn.className = 'rg-filter-clear';
            clearBtn.textContent = '×';
            clearBtn.onclick = () => this.clearFilter(col.prop, input);

            input.addEventListener('input', () => {
                this.handleFilterInput(col.prop, col.columnType === 'numeric' ? 'numeric' : 'string', input);
            });

            container.appendChild(input);
            container.appendChild(clearBtn);
            filterRow.appendChild(container);
        });

        // Clear all button
        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'rg-clear-all';
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.onclick = () => this.clearAllFilters();

        filterContainer.appendChild(clearAllBtn);
        filterContainer.appendChild(filterRow);
        this.container.appendChild(filterContainer);
    }

    // Update filter widths when columns resize
    updateFilterWidths() {
        const filterCells = this.container.querySelectorAll('.rg-filter-cell');
        this.grid.columns.forEach((col, index) => {
            if (filterCells[index]) {
                filterCells[index].style.width = col.size + 'px';
            }
        });
    }

    // Create grid
    createGrid() {
        const gridContainer = document.createElement('div');
        gridContainer.className = 'rg-grid-container';

        this.grid = document.createElement('revo-grid');
        this.grid.columns = this.columns;
        this.grid.source = this.originalData;
        this.grid.theme = 'material';
        this.grid.rowHeaders = true;
        this.grid.filter = false;
        this.grid.resize = true;
        this.grid.autoSizeColumn = true;
        this.grid.rowSize = 40;
        this.grid.readonly = true;
        this.grid.sortable = true;
        this.grid.range = true;

        this.grid.addEventListener('aftercolumnresize', () => this.updateFilterWidths());

        gridContainer.appendChild(this.grid);
        this.container.appendChild(gridContainer);
    }

    // Update data
    setData(data) {
        this.data = data;
        this.originalData = [...data];
        this.applyFilters();
    }

    // Update columns
    setColumns(columns) {
        this.columns = columns;
        if (this.grid) {
            this.grid.columns = columns;
        }
    }
}