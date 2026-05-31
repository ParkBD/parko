# ParkNest Makefile — unified commands for all platforms.
# Requires: make (Linux/macOS built-in; Windows: choco install make)
# Alternatively use scripts/dev.sh or scripts/dev.ps1 directly.

.DEFAULT_GOAL := help
SHELL         := /bin/bash

# Detect OS for platform-specific compose file
UNAME_S := $(shell uname -s 2>/dev/null || echo Windows)
UNAME_M := $(shell uname -m 2>/dev/null || echo x86_64)

ifeq ($(UNAME_S),Darwin)
  OVERRIDE := docker-compose.mac.yml
  ifeq ($(UNAME_M),arm64)
    export DOCKER_DEFAULT_PLATFORM := linux/arm64
  else
    export DOCKER_DEFAULT_PLATFORM := linux/amd64
  endif
else ifeq ($(UNAME_S),Linux)
  OVERRIDE := docker-compose.linux.yml
  export DOCKER_DEFAULT_PLATFORM := linux/amd64
  export UID := $(shell id -u)
  export GID := $(shell id -g)
else
  # Windows (Git Bash / WSL)
  OVERRIDE := docker-compose.windows.yml
  export DOCKER_DEFAULT_PLATFORM := linux/amd64
  export CHOKIDAR_USEPOLLING := true
  export WATCHPACK_POLLING := true
endif

export DOCKER_BUILDKIT          := 1
export COMPOSE_DOCKER_CLI_BUILD := 1

DC := docker compose -f docker-compose.yml -f $(OVERRIDE)

# ─────────────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Dev lifecycle ─────────────────────────────────────────────────────────────

.PHONY: up
up: ## Start all dev services (foreground)
	$(DC) up

.PHONY: up-d
up-d: ## Start all dev services (detached)
	$(DC) up -d

.PHONY: down
down: ## Stop and remove containers
	$(DC) down

.PHONY: down-v
down-v: ## Stop containers AND remove volumes (fresh start)
	$(DC) down -v

.PHONY: build
build: ## Rebuild all images (use after package.json changes)
	$(DC) build --no-cache

.PHONY: build-api
build-api: ## Rebuild only the API image
	$(DC) build --no-cache api worker

.PHONY: build-web
build-web: ## Rebuild only the Web image
	$(DC) build --no-cache web

.PHONY: restart
restart: ## Restart all services
	$(DC) restart

# ── Logs ─────────────────────────────────────────────────────────────────────

.PHONY: logs
logs: ## Tail logs for all services
	$(DC) logs -f

.PHONY: logs-api
logs-api: ## Tail API logs
	$(DC) logs -f api

.PHONY: logs-web
logs-web: ## Tail Web logs
	$(DC) logs -f web

.PHONY: logs-worker
logs-worker: ## Tail Worker logs
	$(DC) logs -f worker

# ── Shells ────────────────────────────────────────────────────────────────────

.PHONY: shell-api
shell-api: ## Open shell in API container
	$(DC) exec api sh

.PHONY: shell-web
shell-web: ## Open shell in Web container
	$(DC) exec web sh

.PHONY: shell-db
shell-db: ## Open psql in Postgres container
	$(DC) exec postgres psql -U parknest -d parknest_db

.PHONY: shell-redis
shell-redis: ## Open redis-cli
	$(DC) exec redis redis-cli -a redisdev

# ── Database ──────────────────────────────────────────────────────────────────

.PHONY: migrate
migrate: ## Run Prisma migrations (dev)
	$(DC) exec api npx prisma migrate dev

.PHONY: migrate-reset
migrate-reset: ## Reset DB and re-apply all migrations
	$(DC) exec api npx prisma migrate reset --force

.PHONY: seed
seed: ## Run database seed script
	$(DC) exec api npx ts-node prisma/seed.ts

.PHONY: studio
studio: ## Start Prisma Studio (port 5555)
	$(DC) exec api npx prisma studio

.PHONY: generate
generate: ## Re-generate Prisma client (after schema changes)
	$(DC) exec api npx prisma generate

# ── Testing ───────────────────────────────────────────────────────────────────

.PHONY: test
test: ## Run API unit tests inside container
	$(DC) exec api npm test

.PHONY: test-cov
test-cov: ## Run tests with coverage
	$(DC) exec api npm run test:cov

# ── Utilities ─────────────────────────────────────────────────────────────────

.PHONY: ps
ps: ## Show running containers
	$(DC) ps

.PHONY: urls
urls: ## Print all local dev URLs
	@echo ""
	@echo "  API          http://localhost:3001/api"
	@echo "  Swagger      http://localhost:3001/api/docs"
	@echo "  Web          http://localhost:3000"
	@echo "  Adminer      http://localhost:8080  (server: postgres, user: parknest, pass: parknest_dev)"
	@echo "  Mailhog      http://localhost:8025"
	@echo "  MinIO UI     http://localhost:9001  (user: parknest, pass: parknest_minio_dev)"
	@echo "  Redis        localhost:6379"
	@echo ""

.PHONY: clean
clean: down-v ## Remove containers, volumes, and dangling images
	docker image prune -f
