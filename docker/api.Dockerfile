# ─── Stage 1: dependency install ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install libc compat for native modules (bcrypt, etc.)
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before build so it's embedded in dist
RUN npx prisma generate

RUN npm run build

# Prune to production deps only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ─── Stage 3: production runner ──────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache libc6-compat openssl curl

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

# Copy only what's needed to run
COPY --from=builder --chown=nestjs:nodejs /app/dist       ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma     ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fs http://localhost:3001/health || exit 1

CMD ["node", "dist/main"]
