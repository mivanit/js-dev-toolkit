.PHONY: test test-all test-single clean help

# Default target
help:
	@echo "Available targets:"
	@echo "  make test              - Run all tests"
	@echo "  make test-DataFrame    - Run DataFrame tests"
	@echo "  make test-ColorUtil    - Run ColorUtil tests"
	@echo "  make test-array        - Run NDArray tests"
	@echo "  make test-yaml         - Run YAML tests"
	@echo "  make test-sparklines   - Run sparklines tests"
	@echo "  make test-table        - Run DataTable tests"
	@echo "  make test-notif        - Run notification tests"
	@echo "  make test-config       - Run config tests"
	@echo "  make clean             - Clean up temporary files"

# Run all tests
test: test-all

test-all:
	@echo "\n=========================================="
	@echo "Running all JavaScript tests..."
	@echo "==========================================\n"
	@node --test tests/test-DataFrame.js
	@node --test tests/test-ColorUtil.js
	@node --test tests/test-array.js
	@node --test tests/test-yaml.js
	@node --test tests/test-sparklines.js
	@node --test tests/test-table.js
	@node --test tests/test-notif.js
	@node --test tests/test-config.js
	@echo "\n=========================================="
	@echo "All tests completed!"
	@echo "==========================================\n"

# Individual test targets
test-DataFrame:
	@echo "Running DataFrame tests..."
	@node --test tests/test-DataFrame.js

test-ColorUtil:
	@echo "Running ColorUtil tests..."
	@node --test tests/test-ColorUtil.js

test-array:
	@echo "Running NDArray tests..."
	@node --test tests/test-array.js

test-yaml:
	@echo "Running YAML tests..."
	@node --test tests/test-yaml.js

test-sparklines:
	@echo "Running sparklines tests..."
	@node --test tests/test-sparklines.js

test-table:
	@echo "Running DataTable tests..."
	@node --test tests/test-table.js

test-notif:
	@echo "Running notification tests..."
	@node --test tests/test-notif.js

test-config:
	@echo "Running config tests..."
	@node --test tests/test-config.js

# Clean up
clean:
	@echo "Cleaning up temporary files..."
	@rm -f tests/.temp
