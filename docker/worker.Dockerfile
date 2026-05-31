# Worker shares the exact same build as the API.
# Only the entrypoint differs: node dist/worker instead of node dist/main.
# Build this with --target production from api.Dockerfile, then override CMD.

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package*.json ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl curl
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/dist        ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma      ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
USER nestjs

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('bullmq'); process.exit(0)" || exit 1

# Worker entry — no HTTP server, only queue processors
CMD ["node", "dist/worker"]
