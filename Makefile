# shellcheck disable=SC2037,SC2145,SC2276,SC2283
UV ?= uv
API = $(UV) --directory apps/api
BOT = $(UV) --directory apps/telegram-bot
NPM ?= npm --prefix apps/web

.PHONY: help infra down install dev test lint format typecheck contracts \
	install-api dev-api test-api lint-api format-api typecheck-api \
	install-web dev-web test-web lint-web typecheck-web build-web \
	install-bot dev-bot test-bot lint-bot format-bot typecheck-bot \
	migrate seed demo reset-demo

help:
	@echo "VANIK developer targets"
	@echo "infra          Start PostgreSQL and Redis"
	@echo "down           Stop local infrastructure"
	@echo "install        Sync API, bot environment and install web dependencies"
	@echo "dev            Run the API on port 8000"
	@echo "dev-web        Run the Next.js web application on port 3000"
	@echo "dev-bot        Run the Telegram Bot worker"
	@echo "test           Run API, web, and bot tests"
	@echo "lint           Check API, web, and bot formatting/linting"
	@echo "format         Format API and bot source"
	@echo "typecheck      Run strict API, web, and bot type checks"
	@echo "build-web      Build production bundle for web application"
	@echo "contracts      Export versioned JSON schemas"
	@echo "migrate        Apply database migrations"
	@echo "seed           Insert missing synthetic demo data without resetting existing state"
	@echo "demo           Run deterministic domain and isolated API workflow rehearsal"
	@echo "reset-demo     Safety guard; destructive reset is not implemented"

infra:
	docker compose up -d postgres redis

down:
	docker compose down

install: install-api install-web install-bot
install-api:
	$(API) sync --locked
install-web:
	npm ci --prefix apps/web
install-bot:
	$(BOT) sync --locked

dev: dev-api
dev-api:
	$(API) run --locked uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
dev-web:
	$(NPM) run dev
dev-bot:
	$(BOT) run --locked python -m bot.main

test: test-api test-web test-bot
test-api:
	$(API) run --locked python -m pytest
test-web:
	$(NPM) run test
test-bot:
	$(BOT) run --locked python -m pytest

lint: lint-api lint-web lint-bot
lint-api:
	$(API) run --locked ruff check app scripts tests alembic
	$(API) run --locked ruff format --check app scripts tests alembic
lint-web:
	$(NPM) run lint
lint-bot:
	$(BOT) run --locked ruff check bot tests
	$(BOT) run --locked ruff format --check bot tests

format: format-api format-bot
format-api:
	$(API) run --locked ruff format app scripts tests alembic
format-bot:
	$(BOT) run --locked ruff format bot tests

typecheck: typecheck-api typecheck-web typecheck-bot
typecheck-api:
	$(API) run --locked mypy app scripts tests
typecheck-web:
	$(NPM) run typecheck
typecheck-bot:
	$(BOT) run --locked mypy bot tests

build-web:
	$(NPM) run build

contracts:
	$(API) run --locked python scripts/export_schemas.py

migrate:
	test -n "$$(find apps/api/alembic/versions -name '*.py' -print -quit)" || \
		{ echo "No schema migrations exist yet. Phase 1 must add real revisions." >&2; exit 1; }
	$(API) run --locked alembic upgrade head

seed:
	$(API) run --locked python -m app.seed

demo:
	$(API) run --locked python scripts/validate_demo.py
	$(API) run --locked python -m pytest tests/test_workflow.py -q

reset-demo:
	@echo "Destructive reset is not implemented. No data changed. Use a fresh demo database." >&2
	@exit 1
