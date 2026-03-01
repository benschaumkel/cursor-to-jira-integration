.PHONY: setup test lint clean help

help:
	@echo "make setup   — install deps, create .env from example"
	@echo "make test    — run tests"
	@echo "make lint    — lint all source files"
	@echo "make clean   — remove generated files"

setup:
	npm install
	@cp -n .env.example .env 2>/dev/null && echo "Created .env — fill in your credentials" || echo ".env already exists"
	@cp -n config.yaml.example config.yaml 2>/dev/null && echo "Created config.yaml — fill in your domain and project keys" || echo "config.yaml already exists"

test:
	npm test

lint:
	npm run lint

clean:
	rm -f sprint.md .sprint-meta.json
