#!/usr/bin/env python3
"""Pytest-based browser test runner"""

from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright


def get_test_files():
    """Get all HTML test files"""
    return sorted(Path(__file__).parent.glob("test-*.html"))


def get_demo_files():
    """Get all demo HTML files to smoke test"""
    project_root = Path(__file__).parent.parent
    demo_files = []

    # Add main index.html
    index_html = project_root / "index.html"
    if index_html.exists():
        demo_files.append(index_html)

    # Add all demos/*.html files
    demos_dir = project_root / "demos"
    if demos_dir.exists():
        demo_files.extend(sorted(demos_dir.glob("*.html")))

    return demo_files


def run_test_file(test_file, browser_type="chromium"):
    """Load HTML test file in browser and fail if any errors occur"""
    console_messages = []
    page_errors = []

    with sync_playwright() as p:
        browser = getattr(p, browser_type).launch(headless=True)
        page = browser.new_page()

        # Capture all console messages
        def handle_console(msg):
            console_messages.append({"type": msg.type, "text": msg.text})
            print(f"  [{msg.type}] {msg.text}")

        # Capture page errors
        def handle_error(err):
            page_errors.append(str(err))

        page.on("console", handle_console)
        page.on("pageerror", handle_error)

        # Load the test file
        page.goto(f"file://{test_file.absolute()}", wait_until="networkidle")

        # Wait for tests to complete
        page.wait_for_function("window.TEST_RESULTS !== undefined", timeout=30000)

        # Get results
        results = page.evaluate("window.TEST_RESULTS")

        browser.close()

    # Check for console errors or warnings
    errors = [m for m in console_messages if m["type"] == "error"]
    warnings = [m for m in console_messages if m["type"] == "warning"]

    if errors:
        raise AssertionError(f"Console errors found: {[e['text'] for e in errors]}")

    if warnings:
        raise AssertionError(f"Console warnings found: {[w['text'] for w in warnings]}")

    # Fail if there were any page errors
    if page_errors:
        raise AssertionError(f"Page errors occurred: {page_errors}")

    # Fail if any tests failed
    if results["failed"] > 0:
        raise AssertionError(f"{results['failed']} test(s) failed")

    print(f"  ✓ {results['passed']}/{results['total']} tests passed")


def run_demo_file(demo_file, browser_type="chromium"):
    """Load demo HTML file in browser and check for errors (smoke test)"""
    console_messages = []
    page_errors = []

    with sync_playwright() as p:
        browser = getattr(p, browser_type).launch(headless=True)
        page = browser.new_page()

        # Capture all console messages
        def handle_console(msg):
            console_messages.append({"type": msg.type, "text": msg.text})
            print(f"  [{msg.type}] {msg.text}")

        # Capture page errors
        def handle_error(err):
            page_errors.append(str(err))

        page.on("console", handle_console)
        page.on("pageerror", handle_error)

        # Load the demo file
        page.goto(f"file://{demo_file.absolute()}", wait_until="networkidle")

        # Wait a bit for any dynamic content to load
        page.wait_for_timeout(1000)

        browser.close()

    # Check for console errors or warnings
    errors = [m for m in console_messages if m["type"] == "error"]
    warnings = [m for m in console_messages if m["type"] == "warning"]

    if errors:
        raise AssertionError(f"Console errors found: {[e['text'] for e in errors]}")

    if warnings:
        raise AssertionError(f"Console warnings found: {[w['text'] for w in warnings]}")

    # Fail if there were any page errors
    if page_errors:
        raise AssertionError(f"Page errors occurred: {page_errors}")

    print(f"  ✓ Demo page loaded without errors")


@pytest.mark.parametrize("test_file", get_test_files(), ids=lambda f: f.stem)
def test_html_file(test_file):
    """Run each HTML test file"""
    run_test_file(test_file, browser_type="chromium")


@pytest.mark.parametrize("demo_file", get_demo_files(), ids=lambda f: f.stem)
def test_demo_file(demo_file):
    """Smoke test each demo HTML file"""
    run_demo_file(demo_file, browser_type="chromium")
