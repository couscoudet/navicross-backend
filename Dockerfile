# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files (pnpm requires pnpm-lock.yaml)
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies needed for build)
# --frozen-lockfile ensures reproducible builds (equivalent to npm ci)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package.json for pnpm scripts
COPY package.json pnpm-lock.yaml ./

# Copy source code and configuration
COPY . .

# Build the NestJS application using pnpm
RUN pnpm run build

# ============================================
# Stage 3: Production Dependencies
# ============================================
FROM node:20-alpine AS production-deps

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
# --prod flag installs only production dependencies
# --frozen-lockfile ensures reproducible builds
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# ============================================
# Stage 4: Production Runtime
# ============================================
FROM node:20-alpine AS production

# Install curl for health checks and dumb-init for proper signal handling
RUN apk add --no-cache curl dumb-init

# Set working directory
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=production-deps /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy package.json for metadata (pnpm-lock.yaml not needed in runtime)
COPY package.json ./

# Create non-root user and set ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check
# Adjust the health check endpoint based on your actual health check route
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Use dumb-init to handle signals properly (for graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]
