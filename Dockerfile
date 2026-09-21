FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL="postgresql://postgres:catalyst_secure_pass@localhost:5432/catalyst_db?schema=public"
ENV DIRECT_URL="postgresql://postgres:catalyst_secure_pass@localhost:5432/catalyst_db?schema=public"
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/knowledge ./knowledge
COPY --from=builder /app/architecture ./architecture

EXPOSE 3000
CMD ["npm", "run", "start"]


