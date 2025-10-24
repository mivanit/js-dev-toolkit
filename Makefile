.PHONY: test
test:
	@echo "Run browser-based tests"
	uv run --with pytest --with playwright pytest -vvv tests/run_tests.py

.PHONY: install-playwright
install-playwright:
	@echo "Install Playwright browsers"
	uv run playwright install chromium

.PHONY: clean
clean:
	@echo "Clean up temporary files"
	rm -f tests/.temp