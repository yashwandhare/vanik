UV ?= uv
API = $(UV) --directory apps/api

.PHONY: help infra down install dev test lint format typecheck contracts \
	install-api dev-api test-api lint-api format-api typecheck-api migrate seed demo reset-demo

help:
	@echo "VANIK developer targets (application commands currently cover the API only)"
	@echo "infra       Start PostgreSQL and Redis"
	@echo "down        Stop local infrastructure"
	@echo "install     Sync the locked API development environment"
	@echo "dev         Run the API on port 8000"
	@echo "test        Run API and shared-contract tests"
	@echo "lint        Check API source and formatting"
	@echo "format      Format API source"
	@echo "typecheck   Run strict API type checks"
	@echo "contracts   Export versioned JSON schemas"
	@echo "migrate     Apply database migrations"
	@echo "seed/demo/reset-demo are not implemented yet"

infra:
	docker compose up -d postgres redis

down:
	docker compose down

install: install-api
install-api:
	$(API) sync --locked

dev: dev-api
dev-api:
	$(API) run --locked uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000

test: test-api
test-api:
	$(API) run --locked python -m pytest

lint: lint-api
lint-api:
	$(API) run --locked ruff check app scripts tests alembic
	$(API) run --locked ruff format --check app scripts tests alembic

format: format-api
format-api:
	$(API) run --locked ruff format app scripts tests alembic

typecheck: typecheck-api
typecheck-api:
	$(API) run --locked mypy app scripts tests

contracts:
	$(API) run --locked python scripts/export_schemas.py

migrate:
	@test -n "$$(find apps/api/alembic/versions -name '*.py' -print -quit)" || \
		{ echo "No schema migrations exist yet. Phase 1 must add real revisions." >&2; exit 1; }
	$(API) run --locked alembic upgrade head

seed demo reset-demo:
	@echo "$@ is not implemented yet; no demo state was changed." >&2
	@exit 1
