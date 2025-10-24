// test-helpers.js
// Shared testing utilities for js-dev-toolkit

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

/**
 * Check if two arrays are equal within tolerance
 */
function arrayEqual(a, b, tolerance = 1e-6) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (Math.abs(a[i] - b[i]) > tolerance) return false;
	}
	return true;
}

/**
 * Assert arrays are equal
 */
function assertArrayEqual(a, b, message, tolerance = 1e-6) {
	assert.ok(arrayEqual(a, b, tolerance), message || `Arrays not equal: ${a} vs ${b}`);
}

/**
 * Load a JSON file
 */
function loadJSON(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Load and execute a source file in a sandbox environment
 * @param {string} filename - Name of the file in src/ directory
 * @param {Object} sandbox - Additional globals to add to the context
 * @param {string[]} exposeClasses - Array of class names to explicitly expose to context
 */
function loadSourceFile(filename, sandbox = {}, exposeClasses = []) {
	const srcPath = path.join(__dirname, '..', 'src', filename);
	const code = fs.readFileSync(srcPath, 'utf8');

	// Create context with common globals
	const context = {
		console,
		Math,
		Object,
		Array,
		String,
		Number,
		Boolean,
		Date,
		Set,
		Map,
		Error,
		TypeError,
		...sandbox
	};

	vm.createContext(context);

	// Execute the code
	vm.runInContext(code, context);

	// Explicitly expose classes to the context (for classes that aren't automatically hoisted)
	if (exposeClasses.length > 0) {
		const exposeCode = exposeClasses.map(className => `this.${className} = ${className};`).join('\n');
		vm.runInContext(exposeCode, context);
	}

	return context;
}

/**
 * Create a mock DOM environment for testing DOM-dependent code
 */
function createMockDOM() {
	const elements = new Map();
	let idCounter = 0;

	class MockElement {
		constructor(tagName) {
			this.tagName = tagName;
			this.id = `mock-${idCounter++}`;
			this.children = [];
			this.style = {};
			this.className = '';
			this.innerHTML = '';
			this.textContent = '';
			this.dataset = {};
			this.attributes = {};
			this.parentNode = null;
			this._listeners = {};
			elements.set(this.id, this);
		}

		appendChild(child) {
			this.children.push(child);
			child.parentNode = this;
			return child;
		}

		removeChild(child) {
			const index = this.children.indexOf(child);
			if (index > -1) {
				this.children.splice(index, 1);
				child.parentNode = null;
			}
			return child;
		}

		querySelector(selector) {
			// Simple selector support
			if (selector.startsWith('.')) {
				const className = selector.slice(1);
				return this.children.find(child => child.className.includes(className));
			}
			return this.children[0];
		}

		querySelectorAll(selector) {
			if (selector.startsWith('.')) {
				const className = selector.slice(1);
				return this.children.filter(child => child.className.includes(className));
			}
			return this.children;
		}

		addEventListener(event, handler) {
			if (!this._listeners[event]) {
				this._listeners[event] = [];
			}
			this._listeners[event].push(handler);
		}

		removeEventListener(event, handler) {
			if (this._listeners[event]) {
				const index = this._listeners[event].indexOf(handler);
				if (index > -1) {
					this._listeners[event].splice(index, 1);
				}
			}
		}

		dispatchEvent(event) {
			if (this._listeners[event.type]) {
				this._listeners[event.type].forEach(handler => handler(event));
			}
		}

		setAttribute(name, value) {
			this.attributes[name] = value;
		}

		getAttribute(name) {
			return this.attributes[name];
		}
	}

	const mockDocument = {
		createElement: (tagName) => new MockElement(tagName),
		querySelector: (selector) => {
			if (selector === 'body') {
				return mockDocument.body;
			}
			return null;
		},
		body: new MockElement('body'),
		readyState: 'complete'
	};

	const mockWindow = {
		location: {
			pathname: '/',
			search: '',
			href: 'http://localhost/'
		},
		history: {
			replaceState: (state, title, url) => {
				mockWindow.location.href = url;
			}
		},
		addEventListener: () => {},
		getComputedStyle: () => ({ fontSize: '16px' })
	};

	return { document: mockDocument, window: mockWindow, MockElement };
}

module.exports = {
	assert,
	arrayEqual,
	assertArrayEqual,
	loadJSON,
	loadSourceFile,
	createMockDOM
};
