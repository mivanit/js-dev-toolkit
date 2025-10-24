// test-framework.js
// Simple browser-based test framework

class TestRunner {
	constructor() {
		this.tests = [];
		this.suites = [];
		this.currentSuite = null;
		this.results = {
			passed: 0,
			failed: 0,
			total: 0,
			failures: [],
		};
	}

	describe(name, fn) {
		const prevSuite = this.currentSuite;
		this.currentSuite = { name, tests: [] };
		this.suites.push(this.currentSuite);
		fn();
		this.currentSuite = prevSuite;
	}

	it(name, fn) {
		const test = { name, fn, suite: this.currentSuite?.name || "Global" };
		if (this.currentSuite) {
			this.currentSuite.tests.push(test);
		}
		this.tests.push(test);
	}

	async run() {
		console.log("Starting test run...");
		this.results = { passed: 0, failed: 0, total: 0, failures: [] };

		for (const test of this.tests) {
			this.results.total++;
			try {
				await test.fn();
				this.results.passed++;
				console.log(`✓ ${test.suite} > ${test.name}`);
			} catch (error) {
				this.results.failed++;
				const failure = {
					suite: test.suite,
					test: test.name,
					error: error.message,
					stack: error.stack,
				};
				this.results.failures.push(failure);
				console.error(`✗ ${test.suite} > ${test.name}`);
				console.error(`  ${error.message}`);
			}
		}

		console.log("\n" + "=".repeat(50));
		console.log(`Tests: ${this.results.total}`);
		console.log(`Passed: ${this.results.passed}`);
		console.log(`Failed: ${this.results.failed}`);
		console.log("=".repeat(50));

		if (this.results.failed > 0) {
			console.error("\nFailures:");
			this.results.failures.forEach((f) => {
				console.error(`\n${f.suite} > ${f.test}`);
				console.error(`  ${f.error}`);
			});
		}

		// Store results in window for Playwright to access
		window.TEST_RESULTS = this.results;

		return this.results;
	}
}

// Assertion library
const assert = {
	ok(value, message) {
		if (!value) {
			throw new Error(message || `Expected ${value} to be truthy`);
		}
	},

	strictEqual(actual, expected, message) {
		if (actual !== expected) {
			throw new Error(
				message || `Expected ${actual} to strictly equal ${expected}`,
			);
		}
	},

	deepStrictEqual(actual, expected, message) {
		const actualStr = JSON.stringify(actual);
		const expectedStr = JSON.stringify(expected);
		if (actualStr !== expectedStr) {
			throw new Error(
				message ||
					`Expected ${actualStr} to deeply equal ${expectedStr}`,
			);
		}
	},

	throws(fn, errorMatch, message) {
		let threw = false;
		let error = null;
		try {
			fn();
		} catch (e) {
			threw = true;
			error = e;
		}

		if (!threw) {
			throw new Error(message || "Expected function to throw");
		}

		if (errorMatch) {
			if (errorMatch instanceof RegExp) {
				if (!errorMatch.test(error.message)) {
					throw new Error(
						message ||
							`Expected error message "${error.message}" to match ${errorMatch}`,
					);
				}
			}
		}
	},
};

// Helper function for array comparison
function assertArrayEqual(actual, expected, message, tolerance = 1e-6) {
	if (actual.length !== expected.length) {
		throw new Error(
			message ||
				`Array lengths differ: ${actual.length} vs ${expected.length}`,
		);
	}
	for (let i = 0; i < actual.length; i++) {
		if (Math.abs(actual[i] - expected[i]) > tolerance) {
			throw new Error(
				message ||
					`Arrays differ at index ${i}: ${actual[i]} vs ${expected[i]}`,
			);
		}
	}
}

// Create global test runner instance
const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);

// Auto-run tests after page loads
window.addEventListener("load", async () => {
	await runner.run();
});
