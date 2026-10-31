UV ?= uv
API = $(UV) --directory apps/api
NPM ?= npm --prefix apps/web

.PHONY: help infra down install dev test lint format typecheck contracts \
	install-api dev-api test-api lint-api format-api typecheck-api \
	install-web dev-web test-web lint-web typecheck-web build-web \
	migrate seed demo reset-demo

help:
	@echo "VANIK developer targets"
	@echo "infra          Start PostgreSQL and Redis"
	@echo "down           Stop local infrastructure"
	@echo "install        Sync API environment and install web dependencies"
	@echo "dev            Run the API on port 8000"
	@echo "dev-web        Run the Next.js web application on port 3000"
	@echo "test           Run API, contract, and web tests"
	@echo "lint           Check API and web formatting/linting"
	@echo "typecheck      Run strict API and web type checks"
	@echo "build-web      Build production bundle for web application"
	@echo "contracts      Export versioned JSON schemas"
	@echo "migrate        Apply database migrations when Phase 1 revisions exist"
	@echo "seed/demo/reset-demo are not implemented yet"

infra:
	docker compose up -d postgres redis

down:
	docker compose down

install: install-api install-web
install-api:
	$(API) sync --locked
install-web:
	$(NPM) install

dev: dev-api
dev-api:
	$(API) run --locked uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
dev-web:
	$(NPM) run dev

test: test-api test-web
test-api:
	$(API) run --locked python -m pytest
test-web:
	$(NPM) run test

lint: lint-api lint-web
lint-api:
	$(API) run --locked ruff check app scripts tests alembic
	$(API) run --locked ruff format --check app scripts tests alembic
lint-web:
	$(NPM) run lint

format: format-api
format-api:
	$(API) run --locked ruff format app scripts tests alembic

typecheck: typecheck-api typecheck-web
typecheck-api:
	$(API) run --locked mypy app scripts tests
typecheck-web:
	$(NPM) run typecheck

build-web:
	$(NPM) run build

contracts:
	$(API) run --locked python scripts/export_schemas.py

migrate:
	@test -n "$$(find apps/api/alembic/versions -name '*.py' -print -quit)" || \
		{ echo "No schema migrations exist yet. Phase 1 must add real revisions." >&2; exit 1; }
	$(API) run --locked alembic upgrade head

seed demo reset-demo:
	@echo "$@ is not implemented yet; no demo state was changed." >&2
	@exit 1
