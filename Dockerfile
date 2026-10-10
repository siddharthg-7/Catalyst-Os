# ==========================================
# CatalystOS Full-Stack Production Container
# Multi-stage build: Vite SPA + Express API Gateway
# ==========================================

# Stage 1: Build Frontend and Server Bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install Alpine native build essentials and OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Install dependencies first for optimal Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Dummy DB connection for compile-time Prisma client generation
ENV DATABASE_URL="postgresql://postgres:catalyst_secure_pass@localhost:5432/catalyst_db?schema=public"
ENV DIRECT_URL="postgresql://postgres:catalyst_secure_pass@localhost:5432/catalyst_db?schema=public"

RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime OpenSSL and wget for health checks
RUN apk add --no-cache openssl libc6-compat wget

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled bundles and runtime assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/knowledge ./knowledge
COPY --from=builder /app/architecture ./architecture

# Set permissions for node non-root user
RUN chown -R node:node /app

USER node

EXPOSE 3000

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["npm", "run", "start"]
