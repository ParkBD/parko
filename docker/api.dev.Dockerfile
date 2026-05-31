# ─── API Dev Dockerfile ───────────────────────────────────────────────────────
# Node modules are installed INSIDE the image.
# Source code is bind-mounted at runtime (docker-compose volume).
# A named volume covers /app/node_modules so the host directory NEVER
# overwrites the container's installed packages — critical on Windows.

FROM node:20-alpine

WORKDIR /app

# Native deps (bcrypt, Prisma engines, etc.)
RUN apk add --no-cache libc6-compat openssl python3 make g++ curl

# Copy manifests first — layer cached until package.json changes
COPY package*.json ./

# Install ALL deps (dev + prod) inside the image
RUN npm install

# Copy Prisma schema and generate client
# Source is bind-mounted later; we generate here so the Prisma client
# exists before the app starts even on first run.
COPY prisma ./prisma
RUN npx prisma generate

# Source will be mounted via docker-compose volume
# DO NOT COPY . . here — that would defeat hot reload

EXPOSE 3001

# Polling env vars — overridden per-platform in compose overrides
ENV CHOKIDAR_USEPOLLING=false
ENV CHOKIDAR_INTERVAL=300
ENV WATCHPACK_POLLING=false

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
  CMD curl -fs http://localhost:3001/health || exit 1

CMD ["npm", "run", "dev"]
