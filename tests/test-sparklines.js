// test-sparklines.js
// Tests for sparkline SVG generation

const { describe, it } = require('node:test');
const { assert, loadSourceFile } = require('./test-helpers.js');

// Load sparklines source
const context = loadSourceFile('sparklines.js');
const { sparkline, sparkbars } = context;

describe('sparkline() - basic functionality', () => {

	it('generates SVG string', () => {
		const svg = sparkline([1, 2, 3, 4, 5]);
		assert.ok(svg.startsWith('<svg'));
		assert.ok(svg.endsWith('</svg>'));
	});

	it('includes path element for line', () => {
		const svg = sparkline([1, 2, 3]);
		assert.ok(svg.includes('<path'));
		assert.ok(svg.includes('stroke'));
	});

	it('handles single value', () => {
		const svg = sparkline([5]);
		assert.ok(svg.includes('<svg'));
	});

	it('handles two values', () => {
		const svg = sparkline([1, 2]);
		assert.ok(svg.includes('<path'));
	});

	it('handles negative values', () => {
		const svg = sparkline([-5, -3, -1, 2, 4]);
		assert.ok(svg.includes('<svg'));
	});

	it('handles mixed positive and negative', () => {
		const svg = sparkline([-10, -5, 0, 5, 10]);
		assert.ok(svg.includes('<path'));
	});
});

describe('sparkline() - with options', () => {

	it('respects width option', () => {
		const svg = sparkline([1, 2, 3], null, { width: 200 });
		assert.ok(svg.includes('width="200"'));
	});

	it('respects height option', () => {
		const svg = sparkline([1, 2, 3], null, { height: 100 });
		assert.ok(svg.includes('height="100"'));
	});

	it('respects color option', () => {
		const svg = sparkline([1, 2, 3], null, { color: '#ff0000' });
		assert.ok(svg.includes('#ff0000'));
	});

	it('respects lineWidth option', () => {
		const svg = sparkline([1, 2, 3], null, { lineWidth: 4 });
		assert.ok(svg.includes('stroke-width="4"'));
	});

	it('adds markers when specified', () => {
		const svg = sparkline([1, 2, 3], null, { markers: 3 });
		assert.ok(svg.includes('<circle'));
	});

	it('omits markers when null', () => {
		const svg = sparkline([1, 2, 3], null, { markers: null });
		assert.ok(!svg.includes('<circle'));
	});
});

describe('sparkline() - with x and y values', () => {

	it('accepts separate x and y arrays', () => {
		const xvals = [0, 1, 2, 3];
		const yvals = [10, 20, 15, 25];
		const svg = sparkline(xvals, yvals);
		assert.ok(svg.includes('<svg'));
	});

	it('throws error for mismatched array lengths', () => {
		const xvals = [0, 1, 2];
		const yvals = [10, 20];
		assert.throws(() => sparkline(xvals, yvals), /must match/);
	});

	it('throws error for non-array yvalues', () => {
		assert.throws(() => sparkline([1, 2, 3], 'invalid'), /must be an array or null/);
	});
});

describe('sparkline() - xlims and ylims', () => {

	it('respects xlims', () => {
		const svg = sparkline([1, 2, 3, 4, 5], null, { xlims: [0, 10] });
		assert.ok(svg.includes('<svg'));
	});

	it('respects ylims', () => {
		const svg = sparkline([1, 2, 3], null, { ylims: [0, 10] });
		assert.ok(svg.includes('<svg'));
	});

	it('handles null in xlims for auto', () => {
		const svg = sparkline([1, 2, 3], null, { xlims: [null, 10] });
		assert.ok(svg.includes('<svg'));
	});

	it('handles null in ylims for auto', () => {
		const svg = sparkline([1, 2, 3], null, { ylims: [0, null] });
		assert.ok(svg.includes('<svg'));
	});
});

describe('sparkline() - axes', () => {

	it('adds x-axis line when requested', () => {
		const svg = sparkline([1, 2, 3], null, {
			xAxis: { line: true }
		});
		assert.ok(svg.includes('<line'));
	});

	it('adds x-axis ticks when requested', () => {
		const svg = sparkline([1, 2, 3], null, {
			xAxis: { ticks: true }
		});
		assert.ok(svg.includes('<text'));
	});

	it('adds y-axis line when requested', () => {
		const svg = sparkline([1, 2, 3], null, {
			yAxis: { line: true }
		});
		assert.ok(svg.includes('<line'));
	});

	it('adds y-axis ticks when requested', () => {
		const svg = sparkline([1, 2, 3], null, {
			yAxis: { ticks: true }
		});
		assert.ok(svg.includes('<text'));
	});
});

describe('sparkline() - shading', () => {

	it('adds solid fill when shading is true', () => {
		const svg = sparkline([1, 2, 3], null, { shading: true });
		assert.ok(svg.includes('<path'));
		// Should have filled path
		assert.ok(svg.includes('fill'));
	});

	it('adds gradient when shading is numeric', () => {
		const svg = sparkline([1, 2, 3], null, { shading: 0.5 });
		assert.ok(svg.includes('linearGradient'));
	});

	it('omits shading when false', () => {
		const svg = sparkline([1, 2, 3], null, { shading: false });
		// Should only have stroke, not fill
		assert.ok(svg.includes('stroke'));
	});
});

describe('sparkline() - log scale', () => {

	it('handles log scale for positive values', () => {
		const svg = sparkline([1, 10, 100], null, { logScale: true });
		assert.ok(svg.includes('<svg'));
	});

	it('throws error for negative values with log scale', () => {
		assert.throws(() => sparkline([-1, 1, 10], null, { logScale: true }), /Log scale requires all values >= 0/);
	});

	it('handles zero values in log scale', () => {
		const svg = sparkline([0, 1, 10], null, { logScale: true });
		assert.ok(svg.includes('<svg'));
	});

	it('formats y-axis ticks with scientific notation for log scale', () => {
		const svg = sparkline([1, 10, 100], null, {
			logScale: true,
			yAxis: { ticks: true }
		});
		assert.ok(svg.includes('<text'));
	});
});

describe('sparkline() - error handling', () => {

	it('throws error for non-array input', () => {
		assert.throws(() => sparkline('not an array'), /must be an array/);
	});

	it('throws error for empty array', () => {
		assert.throws(() => sparkline([]), /cannot be empty/);
	});
});

describe('sparkbars() - basic functionality', () => {

	it('generates SVG string', () => {
		const svg = sparkbars([1, 2, 3, 4, 5]);
		assert.ok(svg.startsWith('<svg'));
		assert.ok(svg.endsWith('</svg>'));
	});

	it('includes rect elements for bars', () => {
		const svg = sparkbars([1, 2, 3]);
		assert.ok(svg.includes('<rect'));
	});

	it('creates multiple bars', () => {
		const svg = sparkbars([1, 2, 3]);
		const rectCount = (svg.match(/<rect/g) || []).length;
		assert.strictEqual(rectCount, 3);
	});

	it('handles single bar', () => {
		const svg = sparkbars([5]);
		assert.ok(svg.includes('<rect'));
	});

	it('handles negative values', () => {
		const svg = sparkbars([-5, -3, -1, 2, 4]);
		assert.ok(svg.includes('<svg'));
	});
});

describe('sparkbars() - with options', () => {

	it('respects width option', () => {
		const svg = sparkbars([1, 2, 3], null, { width: 200 });
		assert.ok(svg.includes('width="200"'));
	});

	it('respects height option', () => {
		const svg = sparkbars([1, 2, 3], null, { height: 100 });
		assert.ok(svg.includes('height="100"'));
	});

	it('respects color option', () => {
		const svg = sparkbars([1, 2, 3], null, { color: '#ff0000' });
		assert.ok(svg.includes('#ff0000'));
	});

	it('respects barWidthRatio option', () => {
		const svg1 = sparkbars([1, 2, 3], null, { barWidthRatio: 1 });
		const svg2 = sparkbars([1, 2, 3], null, { barWidthRatio: 0.5 });
		// Both should generate valid SVG
		assert.ok(svg1.includes('<rect'));
		assert.ok(svg2.includes('<rect'));
	});
});

describe('sparkbars() - with x and y values', () => {

	it('accepts separate x and y arrays', () => {
		const xvals = [0, 1, 2, 3];
		const yvals = [10, 20, 15, 25];
		const svg = sparkbars(xvals, yvals);
		assert.ok(svg.includes('<svg'));
	});

	it('positions bars based on x values', () => {
		const xvals = [0, 2, 4];
		const yvals = [10, 20, 30];
		const svg = sparkbars(xvals, yvals);
		assert.ok(svg.includes('<rect'));
	});
});

describe('sparkbars() - log scale', () => {

	it('handles log scale for positive values', () => {
		const svg = sparkbars([1, 10, 100], null, { logScale: true });
		assert.ok(svg.includes('<svg'));
	});

	it('skips zero bars in log scale', () => {
		const svg = sparkbars([0, 1, 10], null, { logScale: true });
		// Should have 2 bars (skipping zero)
		const rectCount = (svg.match(/<rect/g) || []).length;
		assert.strictEqual(rectCount, 2);
	});
});

describe('sparkbars() - axes', () => {

	it('adds x-axis line when requested', () => {
		const svg = sparkbars([1, 2, 3], null, {
			xAxis: { line: true }
		});
		assert.ok(svg.includes('<line'));
	});

	it('adds y-axis with bars', () => {
		const svg = sparkbars([1, 2, 3], null, {
			yAxis: { line: true }
		});
		assert.ok(svg.includes('<line'));
	});

	it('adds y-axis ticks', () => {
		const svg = sparkbars([1, 2, 3], null, {
			yAxis: { ticks: true }
		});
		assert.ok(svg.includes('<text'));
	});
});

describe('sparkbars() - edge cases', () => {

	it('handles all same values', () => {
		const svg = sparkbars([5, 5, 5]);
		assert.ok(svg.includes('<rect'));
	});

	it('handles large value range', () => {
		const svg = sparkbars([1, 100, 10000]);
		assert.ok(svg.includes('<rect'));
	});

	it('handles very small values', () => {
		const svg = sparkbars([0.001, 0.002, 0.003]);
		assert.ok(svg.includes('<rect'));
	});
});

describe('Integration - sparkline and sparkbars', () => {

	it('both functions produce valid SVG', () => {
		const data = [1, 2, 3, 4, 5];
		const line = sparkline(data);
		const bars = sparkbars(data);

		assert.ok(line.startsWith('<svg'));
		assert.ok(bars.startsWith('<svg'));
		assert.ok(line.endsWith('</svg>'));
		assert.ok(bars.endsWith('</svg>'));
	});

	it('both functions respect common options', () => {
		const data = [1, 2, 3];
		const options = { width: 200, height: 100, color: '#ff0000' };

		const line = sparkline(data, null, options);
		const bars = sparkbars(data, null, options);

		assert.ok(line.includes('width="200"'));
		assert.ok(bars.includes('width="200"'));
		assert.ok(line.includes('#ff0000'));
		assert.ok(bars.includes('#ff0000'));
	});
});
