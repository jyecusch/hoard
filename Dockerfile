# Multi-stage build for Next.js app
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS deps-with-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source code but .dockerignore will exclude .env files
COPY . .

# Build the application
# Only use environment variables explicitly passed through Docker
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone folder if it exists, otherwise copy traditional build
COPY --from=builder /app/public ./public

# Standalone build files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy migration dependencies from deps-with-dev stage
COPY --from=deps-with-dev /app/node_modules ./node_modules
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/drizzle ./drizzle

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]