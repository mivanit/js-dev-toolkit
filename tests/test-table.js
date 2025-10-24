// test-table.js
// Tests for DataTable class

const { describe, it } = require('node:test');
const { assert, createMockDOM, loadSourceFile } = require('./test-helpers.js');

// Create mock DOM
const { document, window } = createMockDOM();

// Load table source with DOM globals
const context = loadSourceFile('table.js', {
	document,
	window,
	URL: {
		createObjectURL: () => 'mock-url',
		revokeObjectURL: () => {}
	},
	Blob: class {
		constructor(parts, options) {
			this.parts = parts;
			this.type = options?.type;
		}
	},
	navigator: {
		clipboard: {
			writeText: async (text) => Promise.resolve()
		}
	}
});

const { DataTable } = context;

describe('DataTable constructor', () => {

	it('creates table with data', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 }
		];
		const table = new DataTable(container, { data });
		assert.ok(table);
		assert.strictEqual(table.data.length, 2);
	});

	it('infers columns from data', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: 30 }
		];
		const table = new DataTable(container, { data });
		assert.strictEqual(table.columns.length, 2);
		assert.ok(table.columns.some(col => col.key === 'name'));
		assert.ok(table.columns.some(col => col.key === 'age'));
	});

	it('accepts explicit columns', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: 30 }
		];
		const columns = [
			{ key: 'name', label: 'Name' },
			{ key: 'age', label: 'Age', type: 'number' }
		];
		const table = new DataTable(container, { data, columns });
		assert.strictEqual(table.columns.length, 2);
		assert.strictEqual(table.columns[0].label, 'Name');
	});

	it('sets default page size', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		assert.strictEqual(table.pageSize, 10);
	});

	it('accepts custom page size', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, { pageSize: 25 });
		assert.strictEqual(table.pageSize, 25);
	});

	it('throws error for invalid container', () => {
		assert.throws(() => new DataTable('non-existent-selector', {}), /container not found/);
	});
});

describe('DataTable.inferType()', () => {

	it('infers number type', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		assert.strictEqual(table.inferType(42), 'number');
		assert.strictEqual(table.inferType(3.14), 'number');
	});

	it('infers string type', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		assert.strictEqual(table.inferType('hello'), 'string');
	});

	it('infers boolean type', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		assert.strictEqual(table.inferType(true), 'boolean');
		assert.strictEqual(table.inferType(false), 'boolean');
	});

	it('infers date type', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		assert.strictEqual(table.inferType(new Date()), 'date');
	});

	it('defaults to string for null/undefined', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		assert.strictEqual(table.inferType(null), 'string');
		assert.strictEqual(table.inferType(undefined), 'string');
	});
});

describe('DataTable.getNestedValue()', () => {

	it('gets simple property', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const obj = { name: 'Alice' };
		assert.strictEqual(table.getNestedValue(obj, 'name'), 'Alice');
	});

	it('gets nested property with dot notation', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const obj = { user: { name: 'Alice' } };
		assert.strictEqual(table.getNestedValue(obj, 'user.name'), 'Alice');
	});

	it('handles deeply nested properties', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const obj = { a: { b: { c: 'value' } } };
		assert.strictEqual(table.getNestedValue(obj, 'a.b.c'), 'value');
	});

	it('returns undefined for missing property', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const obj = { name: 'Alice' };
		assert.strictEqual(table.getNestedValue(obj, 'missing'), undefined);
	});

	it('handles null in chain', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const obj = { user: null };
		assert.strictEqual(table.getNestedValue(obj, 'user.name'), undefined);
	});
});

describe('DataTable.setData()', () => {

	it('updates table data', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, { data: [] });
		const newData = [
			{ name: 'Alice', age: 30 }
		];
		table.setData(newData);
		assert.strictEqual(table.data.length, 1);
	});

	it('resets to first page', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {
			data: new Array(30).fill(null).map((_, i) => ({ id: i })),
			pageSize: 10
		});
		table.currentPage = 3;
		table.setData([{ id: 0 }]);
		assert.strictEqual(table.currentPage, 1);
	});
});

describe('DataTable.addRow()', () => {

	it('adds row to table', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, { data: [] });
		table.addRow({ name: 'Alice', age: 30 });
		assert.strictEqual(table.data.length, 1);
	});

	it('preserves existing data', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {
			data: [{ name: 'Alice', age: 30 }]
		});
		table.addRow({ name: 'Bob', age: 25 });
		assert.strictEqual(table.data.length, 2);
	});
});

describe('DataTable.setPageSize()', () => {

	it('updates page size', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, { pageSize: 10 });
		table.setPageSize(25);
		assert.strictEqual(table.pageSize, 25);
	});

	it('resets to first page', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {
			data: new Array(30).fill(null).map((_, i) => ({ id: i })),
			pageSize: 10
		});
		table.currentPage = 3;
		table.setPageSize(25);
		assert.strictEqual(table.currentPage, 1);
	});
});

describe('DataTable.getTotalPages()', () => {

	it('calculates total pages', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {
			data: new Array(25).fill(null).map((_, i) => ({ id: i })),
			pageSize: 10
		});
		assert.strictEqual(table.getTotalPages(), 3);
	});

	it('handles exact page size', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {
			data: new Array(20).fill(null).map((_, i) => ({ id: i })),
			pageSize: 10
		});
		assert.strictEqual(table.getTotalPages(), 2);
	});

	it('handles single page', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {
			data: new Array(5).fill(null).map((_, i) => ({ id: i })),
			pageSize: 10
		});
		assert.strictEqual(table.getTotalPages(), 1);
	});

	it('handles empty data', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, { data: [] });
		assert.strictEqual(table.getTotalPages(), 0);
	});
});

describe('DataTable.getPageData()', () => {

	it('returns correct page data', () => {
		const container = document.createElement('div');
		const data = new Array(25).fill(null).map((_, i) => ({ id: i }));
		const table = new DataTable(container, { data, pageSize: 10 });
		const page1 = table.getPageData();
		assert.strictEqual(page1.length, 10);
		assert.strictEqual(page1[0].id, 0);
	});

	it('returns correct data for page 2', () => {
		const container = document.createElement('div');
		const data = new Array(25).fill(null).map((_, i) => ({ id: i }));
		const table = new DataTable(container, { data, pageSize: 10 });
		table.currentPage = 2;
		const page2 = table.getPageData();
		assert.strictEqual(page2.length, 10);
		assert.strictEqual(page2[0].id, 10);
	});

	it('returns partial data for last page', () => {
		const container = document.createElement('div');
		const data = new Array(25).fill(null).map((_, i) => ({ id: i }));
		const table = new DataTable(container, { data, pageSize: 10 });
		table.currentPage = 3;
		const page3 = table.getPageData();
		assert.strictEqual(page3.length, 5);
	});
});

describe('DataTable.parseNumericFilter()', () => {

	it('parses equality', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('42');
		assert.deepStrictEqual(filter, { operator: '==', value: 42 });
	});

	it('parses explicit equality', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('==42');
		assert.deepStrictEqual(filter, { operator: '==', value: 42 });
	});

	it('parses greater than', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('>50');
		assert.deepStrictEqual(filter, { operator: '>', value: 50 });
	});

	it('parses less than', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('<100');
		assert.deepStrictEqual(filter, { operator: '<', value: 100 });
	});

	it('parses greater than or equal', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('>=50');
		assert.deepStrictEqual(filter, { operator: '>=', value: 50 });
	});

	it('parses not equal', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('!=42');
		assert.deepStrictEqual(filter, { operator: '!=', value: 42 });
	});

	it('handles negative numbers', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('>-10');
		assert.deepStrictEqual(filter, { operator: '>', value: -10 });
	});

	it('handles decimals', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		const filter = table.parseNumericFilter('<3.14');
		assert.deepStrictEqual(filter, { operator: '<', value: 3.14 });
	});

	it('returns null for invalid input', () => {
		const container = document.createElement('div');
		const table = new DataTable(container, {});
		assert.strictEqual(table.parseNumericFilter('invalid'), null);
		assert.strictEqual(table.parseNumericFilter(''), null);
	});
});

describe('DataTable.applyNumericFilter()', () => {

	const container = document.createElement('div');
	const table = new DataTable(container, {});

	it('applies equality', () => {
		assert.ok(table.applyNumericFilter(42, { operator: '==', value: 42 }));
		assert.ok(!table.applyNumericFilter(43, { operator: '==', value: 42 }));
	});

	it('applies not equal', () => {
		assert.ok(table.applyNumericFilter(43, { operator: '!=', value: 42 }));
		assert.ok(!table.applyNumericFilter(42, { operator: '!=', value: 42 }));
	});

	it('applies greater than', () => {
		assert.ok(table.applyNumericFilter(51, { operator: '>', value: 50 }));
		assert.ok(!table.applyNumericFilter(50, { operator: '>', value: 50 }));
	});

	it('applies less than', () => {
		assert.ok(table.applyNumericFilter(49, { operator: '<', value: 50 }));
		assert.ok(!table.applyNumericFilter(50, { operator: '<', value: 50 }));
	});

	it('applies greater than or equal', () => {
		assert.ok(table.applyNumericFilter(50, { operator: '>=', value: 50 }));
		assert.ok(table.applyNumericFilter(51, { operator: '>=', value: 50 }));
		assert.ok(!table.applyNumericFilter(49, { operator: '>=', value: 50 }));
	});

	it('applies less than or equal', () => {
		assert.ok(table.applyNumericFilter(50, { operator: '<=', value: 50 }));
		assert.ok(table.applyNumericFilter(49, { operator: '<=', value: 50 }));
		assert.ok(!table.applyNumericFilter(51, { operator: '<=', value: 50 }));
	});
});

describe('DataTable.exportCSV()', () => {

	it('exports data to CSV', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 }
		];
		const table = new DataTable(container, { data });
		const csv = table.exportCSV();
		assert.ok(csv.includes('Name,Age'));
		assert.ok(csv.includes('Alice,30'));
		assert.ok(csv.includes('Bob,25'));
	});

	it('handles null values', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: null }
		];
		const table = new DataTable(container, { data });
		const csv = table.exportCSV();
		assert.ok(csv.includes('Alice,'));
	});

	it('quotes strings with commas', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Smith, Alice' }
		];
		const table = new DataTable(container, { data });
		const csv = table.exportCSV();
		assert.ok(csv.includes('"Smith, Alice"'));
	});

	it('escapes quotes', () => {
		const container = document.createElement('div');
		const data = [
			{ quote: 'She said "hello"' }
		];
		const table = new DataTable(container, { data });
		const csv = table.exportCSV();
		assert.ok(csv.includes('""'));
	});

	it('exports only filtered data', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 }
		];
		const table = new DataTable(container, { data });
		table.filters = {
			age: { value: '>26', type: 'number', valid: true, customFilter: null }
		};
		table.applyFiltersAndSort();
		const csv = table.exportCSV();
		assert.ok(csv.includes('Alice'));
		assert.ok(!csv.includes('Bob'));
	});
});

describe('DataTable sorting', () => {

	it('sorts ascending', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Bob', age: 25 },
			{ name: 'Alice', age: 30 }
		];
		const table = new DataTable(container, { data });
		table.sortColumn = 'name';
		table.sortDirection = 'asc';
		table.applyFiltersAndSort();
		assert.strictEqual(table.filteredData[0].name, 'Alice');
	});

	it('sorts descending', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 }
		];
		const table = new DataTable(container, { data });
		table.sortColumn = 'age';
		table.sortDirection = 'desc';
		table.applyFiltersAndSort();
		assert.strictEqual(table.filteredData[0].age, 30);
	});

	it('handles null values', () => {
		const container = document.createElement('div');
		const data = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: null }
		];
		const table = new DataTable(container, { data });
		table.sortColumn = 'age';
		table.sortDirection = 'asc';
		table.applyFiltersAndSort();
		assert.strictEqual(table.filteredData[0].age, 30);
	});
});
