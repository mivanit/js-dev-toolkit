/**
 * Table.js - A streamlined data table with filtering, sorting, and pagination
 */

class DataTable {
    constructor(container, config = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.data = config.data || [];
        this.columns = config.columns || [];
        this.pageSize = config.pageSize || 25;
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = null;
        this.filters = {};
        this.filteredData = [];
        // Renderers are now part of column definitions

        // Auto-generate columns from data if not provided
        if (this.columns.length === 0 && this.data.length > 0) {
            this.columns = Object.keys(this.data[0]).map(key => ({
                key: key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                type: this.inferType(this.data[0][key])
            }));
        }

        this.init();
    }

    inferType(value) {
        if (value === null || value === undefined) return 'string';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (value instanceof Date) return 'date';
        return 'string';
    }

    init() {
        this.createTableStructure();
        this.applyFilters();
        this.render();
    }

    createTableStructure() {
        this.container.innerHTML = '';

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'datatable-wrapper';

        // Create controls container
        const controls = document.createElement('div');
        controls.className = 'datatable-controls';

        // Add clear filters button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'datatable-clear-filters';
        clearBtn.textContent = 'Clear All Filters';
        clearBtn.onclick = () => this.clearAllFilters();
        controls.appendChild(clearBtn);

        // No top pagination - only bottom

        wrapper.appendChild(controls);

        // Create table
        const tableContainer = document.createElement('div');
        tableContainer.className = 'datatable-container';

        const table = document.createElement('table');
        table.className = 'datatable';

        // Create header
        const thead = document.createElement('thead');

        // Header row with column names and sort
        const headerRow = document.createElement('tr');
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.className = 'datatable-header';

            const headerContent = document.createElement('div');
            headerContent.className = 'datatable-header-content';

            const label = document.createElement('span');
            label.textContent = col.label || col.key;
            headerContent.appendChild(label);

            const sortIcon = document.createElement('span');
            sortIcon.className = 'datatable-sort-icon';
            sortIcon.textContent = ' ↕';
            headerContent.appendChild(sortIcon);

            headerContent.onclick = () => this.handleSort(col.key);

            th.appendChild(headerContent);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Filter row
        const filterRow = document.createElement('tr');
        filterRow.className = 'datatable-filter-row';

        this.columns.forEach(col => {
            const td = document.createElement('td');
            td.className = 'datatable-filter-cell';

            const input = document.createElement('input');
            input.className = 'datatable-filter-input';
            input.type = 'text';
            input.placeholder = col.type === 'number' ? 'e.g. >50' : 'Filter...';

            input.addEventListener('input', (e) => {
                this.handleFilter(col.key, e.target.value, col.type);
            });

            td.appendChild(input);
            filterRow.appendChild(td);
        });
        thead.appendChild(filterRow);

        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        tbody.className = 'datatable-body';
        table.appendChild(tbody);

        tableContainer.appendChild(table);
        wrapper.appendChild(tableContainer);

        // Create bottom pagination with page size selector
        const paginationBottom = document.createElement('div');
        paginationBottom.className = 'datatable-pagination datatable-pagination-bottom';
        wrapper.appendChild(paginationBottom);

        this.container.appendChild(wrapper);

        // Store references
        this.tbody = tbody;
        this.paginationBottom = paginationBottom;
        this.headerRow = headerRow;
    }

    handleSort(columnKey) {
        if (this.sortColumn === columnKey) {
            // Cycle through: asc -> desc -> none
            if (this.sortDirection === 'asc') {
                this.sortDirection = 'desc';
            } else if (this.sortDirection === 'desc') {
                this.sortColumn = null;
                this.sortDirection = null;
            }
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }

        this.applyFilters();
        this.render();
    }

    parseNumericFilter(value) {
        const trimmed = value.trim();
        if (!trimmed) return null;

        const match = trimmed.match(/^(==|!=|>=|<=|>|<)?\s*(-?\d+\.?\d*)$/);
        if (!match) return null;

        const operator = match[1] || '==';
        const number = parseFloat(match[2]);

        if (isNaN(number)) return null;

        return { operator, value: number };
    }

    applyNumericFilter(cellValue, filter) {
        if (!filter) return true;

        const value = parseFloat(cellValue);
        if (isNaN(value)) return false;

        switch (filter.operator) {
            case '==': return value === filter.value;
            case '!=': return value !== filter.value;
            case '>': return value > filter.value;
            case '<': return value < filter.value;
            case '>=': return value >= filter.value;
            case '<=': return value <= filter.value;
            default: return true;
        }
    }

    handleFilter(columnKey, filterValue, type) {
        if (!filterValue) {
            delete this.filters[columnKey];
        } else {
            this.filters[columnKey] = {
                value: filterValue,
                type: type
            };
        }

        this.currentPage = 1;
        this.applyFilters();
        this.render();
    }

    applyFilters() {
        // Start with all data
        let filtered = [...this.data];

        // Apply filters
        filtered = filtered.filter(row => {
            for (const [key, filter] of Object.entries(this.filters)) {
                const cellValue = row[key];

                if (filter.type === 'number') {
                    const numFilter = this.parseNumericFilter(filter.value);
                    if (numFilter && !this.applyNumericFilter(cellValue, numFilter)) {
                        return false;
                    }
                } else {
                    // String filter
                    if (cellValue === null || cellValue === undefined) return false;
                    const strValue = String(cellValue).toLowerCase();
                    const filterStr = filter.value.toLowerCase();

                    // Support wildcards
                    if (filterStr.includes('*')) {
                        const regex = new RegExp('^' + filterStr.replace(/\*/g, '.*') + '$');
                        if (!regex.test(strValue)) return false;
                    } else {
                        if (!strValue.includes(filterStr)) return false;
                    }
                }
            }
            return true;
        });

        // Apply sorting
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                const aVal = a[this.sortColumn];
                const bVal = b[this.sortColumn];

                // Handle nulls
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                let comparison = 0;
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal;
                } else {
                    comparison = String(aVal).localeCompare(String(bVal));
                }

                return this.sortDirection === 'desc' ? -comparison : comparison;
            });
        }

        this.filteredData = filtered;
    }

    clearAllFilters() {
        this.filters = {};
        this.container.querySelectorAll('.datatable-filter-input').forEach(input => {
            input.value = '';
        });
        this.currentPage = 1;
        this.applyFilters();
        this.render();
    }

    getPageData() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.filteredData.slice(start, end);
    }

    getTotalPages() {
        return Math.ceil(this.filteredData.length / this.pageSize);
    }

    render() {
        this.renderTable();
        this.renderPagination();
        this.updateSortIcons();
    }

    updateSortIcons() {
        const headers = this.headerRow.querySelectorAll('th');
        headers.forEach((th, index) => {
            const col = this.columns[index];
            const sortIcon = th.querySelector('.datatable-sort-icon');
            if (!sortIcon) return;

            if (this.sortColumn === col.key) {
                if (this.sortDirection === 'asc') {
                    sortIcon.textContent = ' ↑';
                } else if (this.sortDirection === 'desc') {
                    sortIcon.textContent = ' ↓';
                }
            } else {
                sortIcon.textContent = ' ↕';
            }
        });
    }

    renderTable() {
        this.tbody.innerHTML = '';

        const pageData = this.getPageData();

        if (pageData.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = this.columns.length;
            td.className = 'datatable-empty';
            td.textContent = 'No data to display';
            tr.appendChild(td);
            this.tbody.appendChild(tr);
            return;
        }

        pageData.forEach(row => {
            const tr = document.createElement('tr');

            this.columns.forEach(col => {
                const td = document.createElement('td');
                const value = row[col.key];

                // Check for custom renderer in column definition
                if (col.renderer) {
                    const rendered = col.renderer(value, row, col);
                    if (typeof rendered === 'string') {
                        td.innerHTML = rendered;
                    } else {
                        td.appendChild(rendered);
                    }
                } else {
                    // Default rendering
                    if (value === null || value === undefined) {
                        td.textContent = '';
                    } else if (col.type === 'number' && typeof value === 'number') {
                        td.textContent = value.toLocaleString();
                    } else {
                        td.textContent = String(value);
                    }
                }

                tr.appendChild(td);
            });

            this.tbody.appendChild(tr);
        });
    }

    renderPagination() {
        const totalPages = this.getTotalPages();
        const paginationHTML = this.createPaginationHTML(totalPages);

        this.paginationTop.innerHTML = paginationHTML;
        this.paginationBottom.innerHTML = paginationHTML;

        // Add event listeners
        [this.paginationTop, this.paginationBottom].forEach(container => {
            container.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.target.dataset.page);
                    if (!isNaN(page)) {
                        this.currentPage = page;
                        this.render();
                    }
                });
            });
        });
    }

    createPaginationHTML(totalPages) {
        if (totalPages <= 1) return '';

        let html = '<div class="datatable-pagination-info">';
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.filteredData.length);
        html += `Showing ${start}-${end} of ${this.filteredData.length} entries`;
        html += '</div>';

        html += '<div class="datatable-pagination-buttons">';

        // Previous button
        html += `<button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">Previous</button>`;

        // Page numbers
        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button data-page="1">1</button>`;
            if (startPage > 2) html += '<span>...</span>';
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += '<span>...</span>';
            html += `<button data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">Next</button>`;

        html += '</div>';

        return html;
    }

    // Public methods for data manipulation
    setData(data) {
        this.data = data;
        this.currentPage = 1;
        this.applyFilters();
        this.render();
    }

    addRow(row) {
        this.data.push(row);
        this.applyFilters();
        this.render();
    }

    setPageSize(size) {
        this.pageSize = size;
        this.currentPage = 1;
        this.render();
    }

    exportCSV() {
        const csv = [];

        // Headers
        csv.push(this.columns.map(col => col.label || col.key).join(','));

        // Data
        this.filteredData.forEach(row => {
            const values = this.columns.map(col => {
                const val = row[col.key];
                if (val === null || val === undefined) return '';
                let str = String(val);

                // Escape newlines in cell content
                str = str.replace(/\n/g, '\\n');

                // Escape if contains comma or quotes
                if (str.includes(',') || str.includes('"')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            });
            csv.push(values.join(','));
        });

        return csv.join('\n');
    }
}