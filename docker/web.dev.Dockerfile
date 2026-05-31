# ─── Web Dev Dockerfile ───────────────────────────────────────────────────────
# Same node_modules-inside-image strategy as api.dev.Dockerfile.
# Source bind-mounted; named volume covers node_modules + .next cache.

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat curl

COPY package*.json ./
RUN npm install --legacy-peer-deps

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED=1
ENV CHOKIDAR_USEPOLLING=false
ENV CHOKIDAR_INTERVAL=300
ENV WATCHPACK_POLLING=false

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fs http://localhost:3000/ || exit 1

CMD ["npm", "run", "dev"]
