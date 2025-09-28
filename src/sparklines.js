/**
 * Global constants for sparklines configuration
 */
const _SPARKLINES_CONSTS = {
	// Default chart dimensions
	DEFAULT_WIDTH: 120,
	DEFAULT_HEIGHT: 40,

	// Default styling
	DEFAULT_COLOR: '#4169E1',
	DEFAULT_SHADING: 0.3,
	DEFAULT_LINE_WIDTH: 2,
	DEFAULT_MARKERS: '.',
	DEFAULT_MARGIN: 5,
	DEFAULT_BAR_WIDTH_RATIO: 1,

	// Axis and margin calculations
	AXIS_LABEL_MARGIN: 5,
	BAR_Y_AXIS_SHIFT_RATIO: 0.75,
	Y_AXIS_REDUCTION_FACTOR: 1,
	BAR_OPACITY: 0.8,

	// Marker sizes
	SMALL_MARKER_RADIUS: 2,
	LARGE_MARKER_RADIUS: 3.5,

	// Axis styling
	AXIS_COLOR: '#ccc',
	AXIS_WIDTH: 1,
	AXIS_FONT_SIZE: 9,
	AXIS_TEXT_COLOR: '#666',
	Y_AXIS_TEXT_OFFSET: 10,
	X_AXIS_TEXT_OFFSET: 10,

	// Gradient stops
	GRADIENT_START_OFFSET: '0%',
	GRADIENT_END_OFFSET: '100%',
	GRADIENT_END_OPACITY: 0,

	// Array constraints
	XLIMS_LENGTH: 2,
	YLIMS_LENGTH: 2,

	// Default range fallback
	MIN_RANGE: 1
};

/**
 * SVG Sparkline and Sparkbar Chart Library
 *
 * Creates small inline charts suitable for embedding in tables, dashboards, or text.
 * Charts automatically scale to fit data ranges and support various visual customizations.
 *
 * # Available Functions:
 *  - `sparkline(values, yvalues?, options?)` - Line charts with optional area fills
 *  - `sparkbars(values, yvalues?, options?)` - Bar charts and histograms
 *  - `plot(values, yvalues?, options)` - Underlying chart engine (internal)
 *
 * # Parameters:
 *  - `values : number[]`
 *     Array of values to plot. If yvalues is null, these are y-values with auto x-values (0..n-1).
 *     If yvalues is provided, these are x-values.
 *  - `yvalues : number[]|null`
 *     Array of y-values (defaults to null). When provided, values becomes x-values.
 *  - `options : object`
 *     Configuration object with the following properties:
 *     - `width : number` - SVG width in pixels (defaults to `120`)
 *     - `height : number` - SVG height in pixels (defaults to `40`)
 *     - `color : string` - Color for line, markers, and fill (defaults to `"#4169E1"`)
 *     - `shading : boolean|number` - Fill under the line (sparkline only):
 *       - `false` for no shading
 *       - `true` for solid fill
 *       - `0.0-1.0` for gradient with specified opacity (defaults to `0.3`)
 *     - `lineWidth : number` - Stroke width of the line (sparkline only, defaults to `2`)
 *     - `markers : string` - Data point markers (sparkline only):
 *       - `""` for no markers
 *       - `"."` for small dots
 *       - `"o"` for large dots (defaults to `"."`)
 *     - `barWidthRatio : number` - Width of bars as ratio of available space (sparkbars only):
 *       - `1.0` for bars that touch each other (default)
 *       - `0.8` for bars with small gaps
 *       - `0.5` for bars with large gaps
 *     - `margin : number` - Base margin around the chart (defaults to `5`)
 *     - `xAxis : object` - X-axis configuration:
 *       - `line : boolean` - Draw axis line (defaults to `false`)
 *       - `ticks : boolean` - Show tick labels (defaults to `false`)
 *     - `yAxis : object` - Y-axis configuration:
 *       - `line : boolean` - Draw axis line (defaults to `false`)
 *       - `ticks : boolean` - Show tick labels (defaults to `false`)
 *     - `xlims : [number, number]` - X-axis limits [min, max] (defaults to data range)
 *     - `ylims : [number, number]` - Y-axis limits [min, max] (defaults to data range)
 *
 * # Returns:
 *  - `string`
 *     Complete SVG element as an HTML string
 *
 * # Usage:
 *
 * ```javascript
 * // Basic sparkline with auto x-values (0, 1, 2, 3, 4) - matplotlib style
 * document.getElementById('chart').innerHTML = sparkline([1, 5, 2, 8, 3]);
 *
 * // Sparkline with custom x and y values - matplotlib style
 * document.getElementById('chart').innerHTML = sparkline([0, 2, 4, 6, 8], [1, 5, 2, 8, 3]);
 *
 * // Customized sparkline with axes and custom limits
 * document.getElementById('chart').innerHTML = sparkline([10, 25, 15, 30, 20], null, {
 *     width: 200,
 *     height: 60,
 *     color: '#22c55e',
 *     shading: 0.5,
 *     markers: 'o',
 *     xAxis: { line: true, ticks: true },
 *     yAxis: { line: true, ticks: true },
 *     xlims: [0, 10],
 *     ylims: [0, 40]
 * });
 *
 * // Bar chart / histogram style
 * document.getElementById('chart').innerHTML = sparkbars([5, 8, 3, 12, 7, 9, 4], null, {
 *     color: '#e74c3c'
 * });
 * ```
 */
function plot(values, yvalues = null, options = {}) {
	// Validate inputs
	if (!Array.isArray(values)) {
		throw new Error(`First parameter must be an array, got: ${typeof values}`);
	}

	if (values.length === 0) {
		throw new Error('Values array cannot be empty');
	}

	// Default options
	const opts = {
		width: _SPARKLINES_CONSTS.DEFAULT_WIDTH,
		height: _SPARKLINES_CONSTS.DEFAULT_HEIGHT,
		color: _SPARKLINES_CONSTS.DEFAULT_COLOR,
		shading: _SPARKLINES_CONSTS.DEFAULT_SHADING,
		lineWidth: _SPARKLINES_CONSTS.DEFAULT_LINE_WIDTH,
		markers: _SPARKLINES_CONSTS.DEFAULT_MARKERS,
		margin: _SPARKLINES_CONSTS.DEFAULT_MARGIN,
		style: 'line',
		xAxis: { line: false, ticks: false },
		yAxis: { line: false, ticks: false },
		xlims: null,
		ylims: null,
		barWidthRatio: _SPARKLINES_CONSTS.DEFAULT_BAR_WIDTH_RATIO,
		...options
	};

	// Handle matplotlib-style parameter interpretation
	let xvalues, yvals;

	if (yvalues === null) {
		// values is y-values, generate x-values as 0..n-1
		yvals = values;
		xvalues = Array.from({ length: values.length }, (_, i) => i);
	} else {
		// values is x-values, yvalues is y-values
		if (!Array.isArray(yvalues)) {
			throw new Error(`Second parameter must be an array or null, got: ${typeof yvalues}`);
		}
		xvalues = values;
		yvals = yvalues;
	}

	// Validate that x and y arrays have same length
	if (xvalues.length !== yvals.length) {
		throw new Error(`x-values length (${xvalues.length}) must match y-values length (${yvals ? yvals.length : 'undefined'})`);
	}

	// Validate xlims and ylims format if provided
	if (opts.xlims !== null) {
		if (!Array.isArray(opts.xlims) || opts.xlims.length !== _SPARKLINES_CONSTS.XLIMS_LENGTH) {
			throw new Error('xlims must be an array of two numbers [min, max]');
		}
		if (opts.xlims[0] >= opts.xlims[1]) {
			throw new Error('xlims[0] must be less than xlims[1]');
		}
	}

	if (opts.ylims !== null) {
		if (!Array.isArray(opts.ylims) || opts.ylims.length !== _SPARKLINES_CONSTS.YLIMS_LENGTH) {
			throw new Error('ylims must be an array of two numbers [min, max]');
		}
		if (opts.ylims[0] >= opts.ylims[1]) {
			throw new Error('ylims[0] must be less than ylims[1]');
		}
	}

	// Calculate margins based on what's shown
	const needsLeftMargin = opts.yAxis.ticks;
	const needsBottomMargin = opts.xAxis.ticks;
	// For bar charts with Y-axis, we need extra left margin since axis is shifted left
	const barChartExtraMargin = opts.style === 'bar' && (opts.yAxis.line || opts.yAxis.ticks) ?
		(opts.width - 2 * opts.margin) / yvals.length * _SPARKLINES_CONSTS.BAR_Y_AXIS_SHIFT_RATIO : 0;
	const leftMargin = (needsLeftMargin ? opts.margin + _SPARKLINES_CONSTS.AXIS_LABEL_MARGIN : opts.margin) + barChartExtraMargin;
	const rightMargin = opts.margin;
	const topMargin = opts.margin;
	const bottomMargin = needsBottomMargin ? opts.margin + _SPARKLINES_CONSTS.AXIS_LABEL_MARGIN : opts.margin;

	// Calculate axis limits - use custom limits if provided, otherwise data range
	const ymin = opts.ylims ? opts.ylims[0] : Math.min(...yvals);
	const ymax = opts.ylims ? opts.ylims[1] : Math.max(...yvals);
	const yrange = ymax - ymin || _SPARKLINES_CONSTS.MIN_RANGE;

	const xmin = opts.xlims ? opts.xlims[0] : Math.min(...xvalues);
	const xmax = opts.xlims ? opts.xlims[1] : Math.max(...xvalues);
	const xrange = xmax - xmin || _SPARKLINES_CONSTS.MIN_RANGE;

	const chartWidth = opts.width - leftMargin - rightMargin;
	const chartHeight = opts.height - topMargin - bottomMargin;

	// Build SVG

	// this setup is messy, but syntax highlighting gets confused with template strings??
	let svg = "<svg " + `width="${opts.width}" height="${opts.height}"` + ">";

	if (opts.style === 'bar') {
		// Bar chart rendering - account for reduced width from Y-axis labels
		const yAxisReduction = (opts.yAxis.line || opts.yAxis.ticks) ?
			(needsLeftMargin ? _SPARKLINES_CONSTS.Y_AXIS_REDUCTION_FACTOR : 0) + barChartExtraMargin : 0;
		const effectiveWidth = opts.width - 2 * opts.margin - yAxisReduction;
		const barWidth = effectiveWidth / (yvals.length);
		const baseY = opts.height - bottomMargin;

		yvals.forEach((yval, i) => {
			const xval = xvalues[i];
			// For bars, use the same shortened range as the X-axis
			const adjustedChartWidth = chartWidth - (chartWidth / yvals.length / 2);
			const x = leftMargin + ((xval - xmin) / xrange) * adjustedChartWidth;
			const barHeight = Math.abs((yval - ymin) / yrange) * chartHeight;
			const barY = baseY - barHeight;

			// Calculate bar x position and width
			const actualBarWidth = barWidth * opts.barWidthRatio;
			const barX = x - actualBarWidth / 2;

			svg += `<rect x="${barX}" y="${barY}" width="${actualBarWidth}" height="${barHeight}" fill="${opts.color}" opacity="${_SPARKLINES_CONSTS.BAR_OPACITY}"/>`;
		});
	} else {
		// Line chart rendering (existing code)
		let path = '';
		let dots = '';
		const points = [];

		yvals.forEach((yval, i) => {
			const xval = xvalues[i];
			const x = leftMargin + ((xval - xmin) / xrange) * chartWidth;
			const y = topMargin + (1 - (yval - ymin) / yrange) * chartHeight;
			points.push({ x, y, xval, yval });

			path += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;

			// Add markers
			if (opts.markers === '.') {
				dots += `<circle cx="${x}" cy="${y}" r="${_SPARKLINES_CONSTS.SMALL_MARKER_RADIUS}" fill="${opts.color}"/>`;
			} else if (opts.markers === 'o') {
				dots += `<circle cx="${x}" cy="${y}" r="${_SPARKLINES_CONSTS.LARGE_MARKER_RADIUS}" fill="${opts.color}"/>`;
			}
		});

		// Add shading if requested
		if (opts.shading !== false) {
			if (opts.shading === true) {
				// Solid fill
				for (let i = 0; i < points.length - 1; i++) {
					const p1 = points[i];
					const p2 = points[i + 1];
					const segmentPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p2.x} ${opts.height - bottomMargin} L ${p1.x} ${opts.height - bottomMargin} Z`;
					svg += `<path d="${segmentPath}" fill="${opts.color}"/>`;
				}
			} else {
				// Gradient fill
				const gradId = `grad${Date.now()}${Math.random()}`;
				const opacity = parseFloat(opts.shading);
				svg += `
	            <defs>
	                <linearGradient id="${gradId}" x1="${_SPARKLINES_CONSTS.GRADIENT_START_OFFSET}" y1="${_SPARKLINES_CONSTS.GRADIENT_START_OFFSET}" x2="${_SPARKLINES_CONSTS.GRADIENT_START_OFFSET}" y2="${_SPARKLINES_CONSTS.GRADIENT_END_OFFSET}">
	                    <stop offset="${_SPARKLINES_CONSTS.GRADIENT_START_OFFSET}" style="stop-color:${opts.color};stop-opacity:${opacity}"/>
	                    <stop offset="${_SPARKLINES_CONSTS.GRADIENT_END_OFFSET}" style="stop-color:${opts.color};stop-opacity:${_SPARKLINES_CONSTS.GRADIENT_END_OPACITY}"/>
	                </linearGradient>
	            </defs>`;

				for (let i = 0; i < points.length - 1; i++) {
					const p1 = points[i];
					const p2 = points[i + 1];
					const segmentPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p2.x} ${opts.height - bottomMargin} L ${p1.x} ${opts.height - bottomMargin} Z`;
					svg += `<path d="${segmentPath}" fill="url(#${gradId})"/>`;
				}
			}
		}

		// Add the line
		svg += `<path d="${path}" stroke="${opts.color}" stroke-width="${opts.lineWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

		// Add dots
		svg += dots;
	}

	// Add y-axis
	if (opts.yAxis.line || opts.yAxis.ticks) {
		// For bar charts, shift Y-axis left by 0.75 bar widths to avoid overlap
		const barShift = opts.style === 'bar' ? (chartWidth / yvals.length * _SPARKLINES_CONSTS.BAR_Y_AXIS_SHIFT_RATIO) : 0;
		const yAxisX = leftMargin - barShift;

		if (opts.yAxis.line) {
			svg += `<line x1="${yAxisX}" y1="${topMargin}" x2="${yAxisX}" y2="${opts.height - bottomMargin}"
                      stroke="${_SPARKLINES_CONSTS.AXIS_COLOR}" stroke-width="${_SPARKLINES_CONSTS.AXIS_WIDTH}"/>`;
		}
		if (opts.yAxis.ticks) {
			svg += `<text x="${yAxisX - _SPARKLINES_CONSTS.Y_AXIS_TEXT_OFFSET}" y="${topMargin + _SPARKLINES_CONSTS.Y_AXIS_TEXT_OFFSET}" font-size="${_SPARKLINES_CONSTS.AXIS_FONT_SIZE}" fill="${_SPARKLINES_CONSTS.AXIS_TEXT_COLOR}" text-anchor="end">${ymax}</text>`;
			svg += `<text x="${yAxisX - _SPARKLINES_CONSTS.Y_AXIS_TEXT_OFFSET}" y="${opts.height - bottomMargin + _SPARKLINES_CONSTS.Y_AXIS_TEXT_OFFSET}" font-size="${_SPARKLINES_CONSTS.AXIS_FONT_SIZE}" fill="${_SPARKLINES_CONSTS.AXIS_TEXT_COLOR}" text-anchor="end">${ymin}</text>`;
		}
	}

	// Add x-axis
	if (opts.xAxis.line) {
		// For bar charts, end X-axis at center of last bar, not full width
		const xAxisEnd = opts.style === 'bar' ?
			leftMargin + chartWidth - (chartWidth / yvals.length / 2) :
			opts.width - rightMargin;
		svg += `<line x1="${leftMargin}" y1="${opts.height - bottomMargin}" x2="${xAxisEnd}" y2="${opts.height - bottomMargin}"
                      stroke="${_SPARKLINES_CONSTS.AXIS_COLOR}" stroke-width="${_SPARKLINES_CONSTS.AXIS_WIDTH}"/>`;
	}
	if (opts.xAxis.ticks && yvals.length > 0) {
		// For bar charts, position end tick at center of last bar
		const xTickEnd = opts.style === 'bar' ?
			leftMargin + chartWidth - (chartWidth / yvals.length / 2) :
			opts.width - rightMargin;
		svg += `<text x="${leftMargin}" y="${opts.height - bottomMargin + _SPARKLINES_CONSTS.X_AXIS_TEXT_OFFSET}" font-size="${_SPARKLINES_CONSTS.AXIS_FONT_SIZE}" fill="${_SPARKLINES_CONSTS.AXIS_TEXT_COLOR}" text-anchor="middle">${xmin}</text>`;
		svg += `<text x="${xTickEnd}" y="${opts.height - bottomMargin + _SPARKLINES_CONSTS.X_AXIS_TEXT_OFFSET}" font-size="${_SPARKLINES_CONSTS.AXIS_FONT_SIZE}" fill="${_SPARKLINES_CONSTS.AXIS_TEXT_COLOR}" text-anchor="middle">${xmax}</text>`;
	}

	svg += '</svg>';

	return svg;
}

/**
 * Generate an SVG sparkline (line chart) from data
 * @param {number[]} values - Y-values or X-values if yvalues provided
 * @param {number[]|null} yvalues - Y-values (when values becomes x-values)
 * @param {object} options - Chart options
 * @returns {string} SVG element as HTML string
 */
function sparkline(values, yvalues = null, options = {}) {
	return plot(values, yvalues, { ...options, style: 'line' });
}

/**
 * Generate an SVG sparkbar chart (bar chart) from data
 * @param {number[]} values - Y-values or X-values if yvalues provided
 * @param {number[]|null} yvalues - Y-values (when values becomes x-values)
 * @param {object} options - Chart options
 * @returns {string} SVG element as HTML string
 */
function sparkbars(values, yvalues = null, options = {}) {
	return plot(values, yvalues, { ...options, style: 'bar' });
}