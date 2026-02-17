#!/usr/bin/env python3
"""Standalone coverage runner for JS browser tests."""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from coverage_reporter import CoverageProcessor, CoverageReporter


def get_test_files():
    """Get all HTML test files."""
    return sorted(Path(__file__).parent.glob("test-*.html"))


def get_source_dir():
    """Get source directory."""
    return Path(__file__).parent.parent / "src"


def start_coverage(cdp_client):
    """Start JavaScript coverage collection via CDP."""
    cdp_client.send("Profiler.enable")
    cdp_client.send(
        "Profiler.startPreciseCoverage", {"callCount": True, "detailed": True}
    )


def stop_coverage(cdp_client):
    """Stop coverage and return collected data."""
    result = cdp_client.send("Profiler.takePreciseCoverage")
    cdp_client.send("Profiler.stopPreciseCoverage")
    cdp_client.send("Profiler.disable")
    return result.get("result", [])


def run_test_with_coverage(page, cdp_client, test_file):
    """Run a single test file and collect coverage."""
    console_messages = []
    page_errors = []

    def handle_console(msg):
        console_messages.append({"type": msg.type, "text": msg.text})
        if msg.type == "error":
            print(f"    [error] {msg.text}")

    def handle_error(err):
        page_errors.append(str(err))
        print(f"    [page error] {err}")

    page.on("console", handle_console)
    page.on("pageerror", handle_error)

    # Start coverage BEFORE navigating
    start_coverage(cdp_client)

    # Load the test file
    page.goto(f"file://{test_file.absolute()}", wait_until="networkidle")

    # Wait for tests to complete
    page.wait_for_function("window.TEST_RESULTS !== undefined", timeout=30000)

    # Get results
    results = page.evaluate("window.TEST_RESULTS")

    # Stop coverage and collect data
    coverage_data = stop_coverage(cdp_client)

    return {
        "results": results,
        "coverage": coverage_data,
        "console_messages": console_messages,
        "page_errors": page_errors,
    }


def filter_coverage_to_sources(coverage_entries, source_dir, page):
    """Filter coverage entries to only include files from src/."""
    source_coverage = []
    source_dir_str = str(source_dir.absolute())

    for entry in coverage_entries:
        url = entry.get("url", "")

        if url.startswith("file://"):
            file_path = url[7:]

            if file_path.startswith(source_dir_str) and file_path.endswith(".js"):
                # Extract ALL ranges from functions (including count=0)
                # V8 returns nested ranges - inner ranges override outer ranges
                all_ranges = []
                for func in entry.get("functions", []):
                    for rng in func.get("ranges", []):
                        all_ranges.append(
                            {
                                "startOffset": rng["startOffset"],
                                "endOffset": rng["endOffset"],
                                "count": rng.get("count", 0),
                            }
                        )

                # Get source content by reading the file
                try:
                    source = Path(file_path).read_text()
                except Exception:
                    source = ""

                source_coverage.append(
                    {
                        "url": url,
                        "source": source,
                        "ranges": all_ranges,
                        "file_path": file_path,
                    }
                )

    return source_coverage


def aggregate_coverage(all_coverage_data):
    """Merge coverage data from multiple test runs.

    For each file, collect all ranges from all test runs.
    When calculating line coverage, ranges are processed in order
    and later ranges overwrite earlier ones. If a line is covered
    in ANY test run, it should be marked as covered.
    """
    merged = {}

    for test_coverage in all_coverage_data:
        for entry in test_coverage:
            file_path = entry["file_path"]

            if file_path not in merged:
                merged[file_path] = {
                    "url": entry["url"],
                    "source": entry["source"],
                    "file_path": file_path,
                    "ranges": [],
                }

            # Extend with all ranges from this test run
            merged[file_path]["ranges"].extend(entry.get("ranges", []))

    return merged


def main():
    test_files = get_test_files()
    source_dir = get_source_dir()
    output_dir = Path(__file__).parent.parent / "coverage"

    print(f"Found {len(test_files)} test files")
    print(f"Source directory: {source_dir}")
    print()

    all_coverage = []
    all_results = []
    any_failures = False

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for test_file in test_files:
            print(f"Running {test_file.name}...")

            # Create new context for each test (clean state)
            context = browser.new_context()
            page = context.new_page()

            # Create CDP session for coverage collection
            cdp_client = context.new_cdp_session(page)

            # Run test with coverage
            test_result = run_test_with_coverage(page, cdp_client, test_file)

            # Filter coverage to source files
            filtered_coverage = filter_coverage_to_sources(
                test_result["coverage"], source_dir, page
            )
            all_coverage.append(filtered_coverage)

            # Track results
            results = test_result["results"]
            all_results.append(
                {
                    "file": test_file.name,
                    "passed": results["passed"],
                    "failed": results["failed"],
                    "total": results["total"],
                }
            )

            if results["failed"] > 0:
                any_failures = True

            status = "\u2713" if results["failed"] == 0 else "\u2717"
            print(f"  {status} Passed: {results['passed']}/{results['total']}")

            context.close()

        browser.close()

    # Print test summary
    print("\n" + "-" * 40)
    total_passed = sum(r["passed"] for r in all_results)
    total_tests = sum(r["total"] for r in all_results)
    print(f"Tests: {total_passed}/{total_tests} passed")

    # Aggregate coverage
    print("\nAggregating coverage data...")
    merged_coverage = aggregate_coverage(all_coverage)

    if not merged_coverage:
        print("Warning: No coverage data collected!")
        return 1 if any_failures else 0

    # Process and generate reports
    processor = CoverageProcessor(source_dir)
    processed = processor.process(merged_coverage)

    reporter = CoverageReporter(processed, output_dir)
    reporter.generate_all()

    print(f"Reports generated in {output_dir}/")

    # Exit with error code if any tests failed
    return 1 if any_failures else 0


if __name__ == "__main__":
    sys.exit(main())
