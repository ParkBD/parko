# ParkNest — AGENTS.md

## Quick start

```bash
make up                  # dev stack foreground (all services)
bash scripts/dev.sh up -d  # detached
```

## Project structure

```
parko/
├── apps/api/        # NestJS (main + worker)
│   ├── src/
│   │   ├── main.ts            # HTTP entrypoint
│   │   ├── worker.ts          # BullMQ worker entrypoint
│   │   ├── app.module.ts      # root module
│   │   ├── modules/           # feature modules (18: auth, parking, booking, wallet, etc.)
│   │   ├── common/            # shared guards, filters, interceptors, decorators
│   │   ├── config/            # NestJS ConfigModule config files
│   │   └── infrastructure/    # Prisma, Redis, Queue modules
│   └── prisma/
│       └── schema.prisma      # full PostgreSQL schema
├── apps/web/        # Next.js 14 (App Router)
├── docker/          # Dockerfiles (dev + prod)
├── scripts/         # dev.sh (Linux/macOS), dev.ps1 (Windows)
└── monitoring/      # Grafana/Prometheus config
```

## Key commands

| Action | Command |
|---|---|
| Dev API | `npm run dev:api` (from root) |
| Dev Web | `npm run dev:web` (from root) |
| Lint all | `npm run lint` (root → workspaces) |
| Test API | `npm test` (in `apps/api/`) |
| E2E tests | `npm run test:e2e` (in `apps/api/`) |
| Coverage | `npm run test:cov` (in `apps/api/`) |
| Type-check API | `npx tsc --noEmit` (in `apps/api/`) |
| Type-check Web | `npx tsc --noEmit` (in `apps/web/`) |

## Database (Prisma + PostgreSQL)

- Schema: `apps/api/prisma/schema.prisma`
- All IDs are UUIDs, soft-delete via `deletedAt`, audit via append-only `AuditLog`
- Commands (run inside `apps/api/`): `prisma generate`, `prisma migrate dev`, `prisma migrate deploy` (prod), `prisma studio`, `ts-node prisma/seed.ts`
- Via Docker: `make migrate`, `make seed`, `make studio`
- CI requires `prisma generate` before any type-check or test step
- Binary targets in schema cover native, linux-musl-x64, and linux-musl-arm64

## Docker quirks

- **node_modules lives inside Docker named volumes**, never on host — critical for Windows compatibility (`api_node_modules`, `worker_node_modules`, `web_node_modules`)
- Dev stack auto-detects platform (macOS ARM/Intel, Linux with UID/GID mapping)
- API container auto-runs `prisma migrate dev --skip-seed` on startup
- Worker container tries `dist/worker` first, falls back to `ts-node src/worker.ts`
- Web production uses Next.js `output: 'standalone'` → `node server.js`
- Production images run as non-root user (`nestjs` / `nextjs`)
- Rebuild images after package.json changes: `make build`

## Path aliases (API)

- `@modules/*` → `src/modules/*`
- `@common/*` → `src/common/*`
- `@config/*` → `src/config/*`
- `@infrastructure/*` → `src/infrastructure/*`
- These work in both `tsconfig.json` and Jest config (via `moduleNameMapper`)

## Testing

- **Framework**: Jest + ts-jest, test env: `node`
- Test pattern: `*.spec.ts` under `src/`
- E2E config: `apps/api/test/jest-e2e.json`
- CI runs tests against real Postgres + Redis service containers
- CI command: `npm test -- --passWithNoTests --forceExit --coverage`

## CI/CD (GitHub Actions)

- **ci.yml**: `lint → typecheck` → `test (unit+integration)` → `build Docker images` (push to GHCR)
- Images: api, worker, web — all pushed to `ghcr.io/<owner>/parknest/`
- Tags: `sha-<short>`, branch ref, `latest` (main only)
- **deploy.yml**: triggered on push to `main` — deploys via SSH with zero-downtime rolling update

## Infrastructure

- **PostgreSQL 16** (port 5433, user: parknest, db: parknest_db)
- **Redis 7** (port 6379, password: redisdev)
- **MinIO** (port 9000 API / 9001 UI, user: parknest)
- **Mailhog** (port 1025 SMTP / 8025 UI — catches all outgoing email in dev)
- **Adminer** (port 8080 — Postgres web UI)
- Dev URLs: `make urls`

## Environment

- Copy `.env.example` → `.env` for dev; separate `.env.production` for prod (gitignored)
- Secrets use Docker secrets in production (`secrets/` directory)
- bKash payment integration configured via env vars
