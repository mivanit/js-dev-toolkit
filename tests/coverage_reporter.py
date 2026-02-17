#!/usr/bin/env python3
"""Coverage report generator for JS browser tests."""

import json
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class FileCoverage:
    """Coverage data for a single file."""

    file_path: str
    source: str
    covered_ranges: list = field(default_factory=list)
    total_bytes: int = 0
    covered_bytes: int = 0
    line_coverage: dict = field(default_factory=dict)

    @property
    def coverage_percent(self) -> float:
        if self.total_bytes == 0:
            return 100.0
        return (self.covered_bytes / self.total_bytes) * 100

    @property
    def lines_covered(self) -> int:
        return sum(1 for c in self.line_coverage.values() if c)

    @property
    def lines_total(self) -> int:
        return len(self.line_coverage)


class CoverageProcessor:
    """Process raw V8 coverage data into usable coverage reports."""

    def __init__(self, source_dir: Path):
        self.source_dir = source_dir

    def process(self, merged_coverage: dict) -> dict:
        """Process merged coverage data into FileCoverage objects."""
        processed = {}

        for file_path, data in merged_coverage.items():
            source = data.get("source", "")
            ranges = data.get("ranges", [])

            # Calculate line coverage from byte ranges
            line_coverage = self._calculate_line_coverage(source, ranges)

            # Calculate byte coverage based on line coverage
            # (more accurate than trying to calculate from overlapping byte ranges)
            lines = source.split("\n")
            total_bytes = len(source)
            covered_bytes = sum(
                len(lines[ln - 1]) + 1  # +1 for newline
                for ln, covered in line_coverage.items()
                if covered and ln <= len(lines)
            )

            processed[file_path] = FileCoverage(
                file_path=file_path,
                source=source,
                covered_ranges=ranges,
                total_bytes=total_bytes,
                covered_bytes=min(covered_bytes, total_bytes),
                line_coverage=line_coverage,
            )

        return processed

    def _calculate_line_coverage(self, source: str, ranges: list) -> dict:
        """Convert byte ranges to line coverage.

        V8 returns nested ranges where inner ranges override outer ranges.
        We process ranges in order, and later ranges overwrite earlier ones.
        A line is covered if its final count > 0.
        """
        if not source:
            return {}

        # Build line offset map: (start_offset, end_offset) for each line
        lines = source.split("\n")
        line_offsets = []
        offset = 0
        for line in lines:
            line_offsets.append((offset, offset + len(line)))
            offset += len(line) + 1  # +1 for newline

        # Start all lines with count=0 (uncovered)
        line_counts = {i + 1: 0 for i in range(len(lines))}

        # Process ranges IN ORDER - later ranges overwrite earlier ones
        # This handles nested ranges correctly: outer range may be covered,
        # but inner range with count=0 marks specific lines as uncovered
        for range_data in ranges:
            start = range_data["startOffset"]
            end = range_data["endOffset"]
            count = range_data.get("count", 0)

            for line_num, (line_start, line_end) in enumerate(line_offsets, 1):
                # Check if range overlaps with line
                if start < line_end and end > line_start:
                    line_counts[line_num] = count

        # Convert counts to boolean coverage
        return {ln: (cnt > 0) for ln, cnt in line_counts.items()}


class CoverageReporter:
    """Generate coverage reports in various formats."""

    def __init__(self, coverage_data: dict, output_dir: Path):
        self.coverage_data = coverage_data
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_all(self):
        """Generate all report formats."""
        self.generate_json()
        self.generate_badge()
        self.generate_lcov()
        self.generate_html()
        self.print_summary()

    def generate_json(self) -> Path:
        """Generate JSON coverage report."""
        output_file = self.output_dir / "coverage.json"

        report = {"summary": self._get_summary(), "files": {}}

        for path, cov in self.coverage_data.items():
            report["files"][path] = {
                "coverage_percent": cov.coverage_percent,
                "total_bytes": cov.total_bytes,
                "covered_bytes": cov.covered_bytes,
                "lines_total": cov.lines_total,
                "lines_covered": cov.lines_covered,
            }

        with open(output_file, "w") as f:
            json.dump(report, f, indent=2)

        return output_file

    def generate_badge(self) -> Path:
        """Generate GitHub-style coverage badge SVG."""
        output_file = self.output_dir / "coverage-badge.svg"
        summary = self._get_summary()
        pct = summary["total_coverage"]

        # Color based on coverage percentage
        if pct >= 90:
            color = "#4c1"  # bright green
        elif pct >= 80:
            color = "#97ca00"  # green
        elif pct >= 70:
            color = "#a4a61d"  # yellow-green
        elif pct >= 60:
            color = "#dfb317"  # yellow
        elif pct >= 50:
            color = "#fe7d37"  # orange
        else:
            color = "#e05d44"  # red

        label = "coverage"
        value = f"{pct:.0f}%"

        # Calculate widths (approximate character widths)
        label_width = len(label) * 6 + 10
        value_width = len(value) * 7 + 10
        total_width = label_width + value_width

        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="{total_width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h{label_width}v20H0z"/>
    <path fill="{color}" d="M{label_width} 0h{value_width}v20H{label_width}z"/>
    <path fill="url(#b)" d="M0 0h{total_width}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="{label_width / 2}" y="15" fill="#010101" fill-opacity=".3">{label}</text>
    <text x="{label_width / 2}" y="14">{label}</text>
    <text x="{label_width + value_width / 2}" y="15" fill="#010101" fill-opacity=".3">{value}</text>
    <text x="{label_width + value_width / 2}" y="14">{value}</text>
  </g>
</svg>'''

        with open(output_file, "w") as f:
            f.write(svg)

        return output_file

    def generate_lcov(self) -> Path:
        """Generate LCOV format coverage report."""
        output_file = self.output_dir / "lcov.info"

        lines = []
        for file_path, cov in self.coverage_data.items():
            lines.append(f"SF:{file_path}")

            # Add line coverage data
            for line_num, covered in sorted(cov.line_coverage.items()):
                lines.append(f"DA:{line_num},{1 if covered else 0}")

            # Line summary
            lines.append(f"LF:{cov.lines_total}")
            lines.append(f"LH:{cov.lines_covered}")
            lines.append("end_of_record")

        with open(output_file, "w") as f:
            f.write("\n".join(lines))

        return output_file

    def generate_html(self) -> Path:
        """Generate HTML coverage report."""
        # Generate index.html
        index_file = self.output_dir / "index.html"
        summary = self._get_summary()

        html = self._generate_html_index(summary)
        with open(index_file, "w") as f:
            f.write(html)

        # Generate per-file reports
        for file_path, cov in self.coverage_data.items():
            file_name = Path(file_path).name
            file_html = self._generate_file_html(file_name, cov)

            output_file = self.output_dir / f"{file_name}.html"
            with open(output_file, "w") as f:
                f.write(file_html)

        return index_file

    def _generate_html_index(self, summary: dict) -> str:
        """Generate HTML index page."""

        def coverage_color(pct):
            if pct >= 80:
                return "#4caf50"  # green
            elif pct >= 60:
                return "#ff9800"  # orange
            else:
                return "#f44336"  # red

        rows = []
        for file_path, cov in sorted(self.coverage_data.items()):
            file_name = Path(file_path).name
            color = coverage_color(cov.coverage_percent)
            rows.append(
                f"""
            <tr>
                <td><a href="{file_name}.html">{file_name}</a></td>
                <td style="color: {color}; font-weight: bold;">{cov.coverage_percent:.1f}%</td>
                <td>{cov.lines_covered}/{cov.lines_total} lines</td>
            </tr>
            """
            )

        total_color = coverage_color(summary["total_coverage"])

        return f"""<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; }}
        table {{ border-collapse: collapse; width: 100%; max-width: 800px; }}
        th, td {{ border: 1px solid #ddd; padding: 12px 16px; text-align: left; }}
        th {{ background: #f5f5f5; }}
        tr:hover {{ background: #fafafa; }}
        .summary {{ margin-bottom: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; max-width: 800px; }}
        .summary-value {{ font-size: 2em; font-weight: bold; color: {total_color}; }}
        a {{ color: #1976d2; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <h1>JavaScript Coverage Report</h1>
    <div class="summary">
        <div class="summary-value">{summary["total_coverage"]:.1f}%</div>
        <div>{summary["total_lines_covered"]}/{summary["total_lines"]} lines covered across {summary["files_count"]} files</div>
    </div>
    <table>
        <thead>
            <tr><th>File</th><th>Coverage</th><th>Lines</th></tr>
        </thead>
        <tbody>
            {''.join(rows)}
        </tbody>
    </table>
</body>
</html>"""

    def _generate_file_html(self, file_name: str, cov: FileCoverage) -> str:
        """Generate HTML report for a single file."""
        lines = cov.source.split("\n")
        line_html = []

        for i, line in enumerate(lines, 1):
            covered = cov.line_coverage.get(i, False)
            bg_color = "#e8f5e9" if covered else "#ffebee"
            indicator = "+" if covered else "-"
            indicator_color = "#4caf50" if covered else "#f44336"
            escaped_line = (
                line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            )
            line_html.append(
                f'<div style="background: {bg_color}; padding: 0 8px;">'
                f'<span style="color: #888; user-select: none;">{i:4d}</span>'
                f'<span style="color: {indicator_color}; margin: 0 8px;">{indicator}</span>'
                f"{escaped_line}</div>"
            )

        return f"""<!DOCTYPE html>
<html>
<head>
    <title>Coverage: {file_name}</title>
    <style>
        body {{ font-family: monospace; margin: 0; padding: 20px; font-size: 13px; }}
        h1 {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 1.5em; }}
        pre {{ margin: 0; white-space: pre; overflow-x: auto; }}
        a {{ color: #1976d2; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        .stats {{ margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-family: -apple-system, sans-serif; }}
    </style>
</head>
<body>
    <h1><a href="index.html">Coverage</a> / {file_name}</h1>
    <div class="stats">
        Coverage: <strong>{cov.coverage_percent:.1f}%</strong> ({cov.lines_covered}/{cov.lines_total} lines)
    </div>
    <pre>{''.join(line_html)}</pre>
</body>
</html>"""

    def print_summary(self):
        """Print coverage summary to console."""
        summary = self._get_summary()

        print("\n" + "=" * 65)
        print("COVERAGE SUMMARY")
        print("=" * 65)

        for file_path, cov in sorted(self.coverage_data.items()):
            file_name = Path(file_path).name
            bar_len = 20
            filled = int(bar_len * cov.coverage_percent / 100)
            bar = "\u2588" * filled + "\u2591" * (bar_len - filled)
            print(f"{file_name:25s} {bar} {cov.coverage_percent:5.1f}%")

        print("-" * 65)
        print(f"{'TOTAL':25s}      {summary['total_coverage']:5.1f}%")
        print(f"Lines: {summary['total_lines_covered']}/{summary['total_lines']}")
        print("=" * 65 + "\n")

    def _get_summary(self) -> dict:
        """Calculate overall coverage summary."""
        total_bytes = sum(c.total_bytes for c in self.coverage_data.values())
        covered_bytes = sum(c.covered_bytes for c in self.coverage_data.values())
        total_lines = sum(c.lines_total for c in self.coverage_data.values())
        total_lines_covered = sum(c.lines_covered for c in self.coverage_data.values())

        return {
            "total_bytes": total_bytes,
            "covered_bytes": covered_bytes,
            "total_lines": total_lines,
            "total_lines_covered": total_lines_covered,
            "total_coverage": (
                (covered_bytes / total_bytes * 100) if total_bytes > 0 else 100.0
            ),
            "files_count": len(self.coverage_data),
        }
