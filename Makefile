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

.PHONY: coverage
coverage:
	@echo "Running tests with coverage collection..."
	uv run --with playwright python tests/run_coverage.py

.PHONY: clean-coverage
clean-coverage:
	@echo "Cleaning coverage data..."
	rm -rf coverage/

.PHONY: clean
clean: clean-coverage
	@echo "Clean up temporary files"
	rm -f tests/.temp

.PHONY: format
format:
	@echo "Formatting code in src/"
	npx -y prettier --write "**/*.js" "**/*.html" "**/*.css"
	uv run --with ruff ruff format tests/

.PHONY: format-check
format-check:
	@echo "Checking code formatting"
	npx -y prettier --check "**/*.js" "**/*.html" "**/*.css"
	uv run --with ruff ruff format --check tests/

.PHONY: generate-demo-data
generate-demo-data:
	@echo "Generating demo NPY file..."
	uv run --with numpy python tests/generate_demo_npy.py

.PHONY: docs
docs: generate-demo-data
	@echo "Building docs for GitHub Pages"
	mkdir -p docs/src
	cp -r src/* docs/src/
	@echo "Done! Serve with: python -m http.server -d docs"

.PHONY: docs-clean
docs-clean:
	@echo "Cleaning docs/src directory"
	rm -rf docs/src
