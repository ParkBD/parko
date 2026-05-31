# scripts/dev.ps1 — ParkNest dev launcher for Windows PowerShell / pwsh.
# Auto-detects architecture (x64 / arm64) and applies Windows compose override.
#
# Usage (from repo root):
#   pwsh scripts\dev.ps1              # starts all services
#   pwsh scripts\dev.ps1 up -d        # detached
#   pwsh scripts\dev.ps1 down         # stop
#   pwsh scripts\dev.ps1 logs api     # tail logs
#   pwsh scripts\dev.ps1 build        # rebuild (e.g. after package.json change)
#   pwsh scripts\dev.ps1 migrate      # run Prisma migrations
#   pwsh scripts\dev.ps1 seed         # run DB seed
#   pwsh scripts\dev.ps1 shell api    # open shell in container
param(
    [string]$Command = "up",
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Rest
)

$ErrorActionPreference = "Stop"

# ── Detect architecture ───────────────────────────────────────────────────────
$Arch = (Get-CimInstance Win32_Processor).Architecture
# 9 = ARM64, 0 = x86, 9 also covers ARM64 on some systems
if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $env:DOCKER_DEFAULT_PLATFORM = "linux/arm64"
    Write-Host "[dev] Windows ARM64 detected -> linux/arm64"
} else {
    $env:DOCKER_DEFAULT_PLATFORM = "linux/amd64"
    Write-Host "[dev] Windows x64 detected -> linux/amd64"
}

# ── Polling — required on Windows for file-watch in bind-mounted volumes ──────
$env:CHOKIDAR_USEPOLLING = "true"
$env:CHOKIDAR_INTERVAL   = "500"
$env:WATCHPACK_POLLING   = "true"

# ── BuildKit ──────────────────────────────────────────────────────────────────
$env:DOCKER_BUILDKIT            = "1"
$env:COMPOSE_DOCKER_CLI_BUILD   = "1"

$Base     = @("-f", "docker-compose.yml")
$Override = @("-f", "docker-compose.windows.yml")
$Files    = $Base + $Override

function Invoke-Compose {
    param([string[]]$Args)
    docker compose @Files @Args
}

switch ($Command) {
    "up" {
        Write-Host "[dev] Starting ParkNest dev stack (Windows mode — polling enabled)..."
        Invoke-Compose @("up") + $Rest
    }
    "down" {
        Invoke-Compose @("down") + $Rest
    }
    "build" {
        Write-Host "[dev] Rebuilding images..."
        Invoke-Compose @("build", "--no-cache") + $Rest
    }
    "restart" {
        Invoke-Compose @("restart") + $Rest
    }
    "logs" {
        Invoke-Compose @("logs", "-f") + $Rest
    }
    "shell" {
        $Service = if ($Rest.Count -gt 0) { $Rest[0] } else { "api" }
        Write-Host "[dev] Opening shell in $Service..."
        Invoke-Compose @("exec", $Service, "sh")
    }
    "migrate" {
        Write-Host "[dev] Running Prisma migrations..."
        Invoke-Compose @("exec", "api", "npx", "prisma", "migrate", "dev")
    }
    "seed" {
        Write-Host "[dev] Running database seed..."
        Invoke-Compose @("exec", "api", "npx", "ts-node", "prisma/seed.ts")
    }
    "studio" {
        Write-Host "[dev] Starting Prisma Studio..."
        Invoke-Compose @("exec", "api", "npx", "prisma", "studio", "--browser", "none")
    }
    "reset" {
        Write-Host "[dev] Resetting database..."
        Invoke-Compose @("exec", "api", "npx", "prisma", "migrate", "reset", "--force")
    }
    "ps" {
        Invoke-Compose @("ps")
    }
    default {
        Invoke-Compose @($Command) + $Rest
    }
}
