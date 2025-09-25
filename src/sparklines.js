/**
 * Generate an SVG sparkline chart from data
 * 
 * Creates a small inline chart suitable for embedding in tables, dashboards, or text.
 * The sparkline automatically scales to fit the data range and supports various
 * visual customizations including gradients, markers, and optional axes.
 * 
 * # Parameters:
 *  - `data : number[]`
 *     Array of numeric values to plot
 *  - `options : object`
 *     Configuration object with the following properties:
 *     - `width : number` - SVG width in pixels (defaults to `120`)
 *     - `height : number` - SVG height in pixels (defaults to `40`)
 *     - `color : string` - Color for line, markers, and fill (defaults to `"#4169E1"`)
 *     - `shading : boolean|number` - Fill under the line:
 *       - `false` for no shading
 *       - `true` for solid fill
 *       - `0.0-1.0` for gradient with specified opacity (defaults to `0.3`)
 *     - `lineWidth : number` - Stroke width of the line (defaults to `2`)
 *     - `markers : string` - Data point markers:
 *       - `""` for no markers
 *       - `"."` for small dots
 *       - `"o"` for large dots (defaults to `"."`)
 *     - `margin : number` - Base margin around the chart (defaults to `5`)
 *     - `xAxis : object` - X-axis configuration:
 *       - `line : boolean` - Draw axis line (defaults to `false`)
 *       - `ticks : boolean` - Show tick labels (defaults to `false`)
 *     - `yAxis : object` - Y-axis configuration:
 *       - `line : boolean` - Draw axis line (defaults to `false`) 
 *       - `ticks : boolean` - Show tick labels (defaults to `false`)
 * 
 * # Returns:
 *  - `string`
 *     Complete SVG element as an HTML string
 * 
 * # Usage:
 * 
 * ```javascript
 * // Basic sparkline
 * document.getElementById('chart').innerHTML = sparkline([1, 5, 2, 8, 3]);
 * 
 * // Customized sparkline with axes
 * document.getElementById('chart').innerHTML = sparkline([10, 25, 15, 30, 20], {
 *     width: 200,
 *     height: 60,
 *     color: '#22c55e',
 *     shading: 0.5,
 *     markers: 'o',
 *     xAxis: { line: true, ticks: true },
 *     yAxis: { line: true, ticks: true }
 * });
 * ```
 */
function sparkline(data, options = {}) {
    // Default options
    const opts = {
        width: 120,
        height: 40,
        color: '#4169E1',
        shading: 0.3,
        lineWidth: 2,
        markers: '.',
        margin: 5,
        xAxis: { line: false, ticks: false },
        yAxis: { line: false, ticks: false },
        ...options
    };
    
    // Calculate margins based on what's shown
    const needsLeftMargin = opts.yAxis.ticks;
    const needsBottomMargin = opts.xAxis.ticks;
    const leftMargin = needsLeftMargin ? opts.margin + 20 : opts.margin;
    const rightMargin = opts.margin;
    const topMargin = opts.margin;
    const bottomMargin = needsBottomMargin ? opts.margin + 15 : opts.margin;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const chartWidth = opts.width - leftMargin - rightMargin;
    const chartHeight = opts.height - topMargin - bottomMargin;
    
    // Build path
    let path = '';
    let dots = '';
    const points = [];
    
    data.forEach((val, i) => {
        const x = leftMargin + (i / (data.length - 1)) * chartWidth;
        const y = topMargin + (1 - (val - min) / range) * chartHeight;
        points.push({x, y, val});
        
        path += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        
        // Add markers
        if (opts.markers === '.') {
            dots += `<circle cx="${x}" cy="${y}" r="2" fill="${opts.color}"/>`;
        } else if (opts.markers === 'o') {
            dots += `<circle cx="${x}" cy="${y}" r="3.5" fill="${opts.color}"/>`;
        }
    });
    
    // Build SVG
    let svg = `<svg width="${opts.width}" height="${opts.height}">`;
    
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
                <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${opts.color};stop-opacity:${opacity}"/>
                    <stop offset="100%" style="stop-color:${opts.color};stop-opacity:0"/>
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
    
    // Add y-axis
    if (opts.yAxis.line) {
        svg += `<line x1="${leftMargin}" y1="${topMargin}" x2="${leftMargin}" y2="${opts.height - bottomMargin}" 
                      stroke="#ccc" stroke-width="1"/>`;
    }
    if (opts.yAxis.ticks) {
        svg += `<text x="${leftMargin - 3}" y="${topMargin + 3}" font-size="9" fill="#666" text-anchor="end">${max}</text>`;
        svg += `<text x="${leftMargin - 3}" y="${opts.height - bottomMargin + 3}" font-size="9" fill="#666" text-anchor="end">${min}</text>`;
    }
    
    // Add x-axis
    if (opts.xAxis.line) {
        svg += `<line x1="${leftMargin}" y1="${opts.height - bottomMargin}" x2="${opts.width - rightMargin}" y2="${opts.height - bottomMargin}" 
                      stroke="#ccc" stroke-width="1"/>`;
    }
    if (opts.xAxis.ticks && data.length > 0) {
        svg += `<text x="${leftMargin}" y="${opts.height - bottomMargin + 12}" font-size="9" fill="#666" text-anchor="middle">0</text>`;
        svg += `<text x="${opts.width - rightMargin}" y="${opts.height - bottomMargin + 12}" font-size="9" fill="#666" text-anchor="middle">${data.length - 1}</text>`;
    }
    
    // Add the line
    svg += `<path d="${path}" stroke="${opts.color}" stroke-width="${opts.lineWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    
    // Add dots
    svg += dots;
    
    svg += '</svg>';
    
    return svg;
}