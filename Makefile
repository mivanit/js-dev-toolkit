.PHONY: test
test:
	@echo "Run browser-based tests"
	uv run --with pytest --with playwright pytest -vvv tests/run_tests.py

.PHONY: test-verbose
test-verbose:
	@echo "Run browser-based tests with verbose output"
	uv run --with pytest --with playwright pytest -vvv tests/run_tests.py -o log_cli=true --log-cli-level=INFO -rA

.PHONY: install-playwright
install-playwright:
	@echo "Install Playwright browsers"
	uv run --with playwright playwright install chromium

.PHONY: clean
clean:
	@echo "Clean up temporary files"
	rm -f tests/.temp

.PHONY: format
format:
	@echo "Formatting code in src/"
	npx -y prettier --write "src/**/*.js" "*.html" "src/**/*.css"
