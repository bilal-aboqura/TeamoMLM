# =============================================================================
# Stage 1: Install Dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only package manifests first to leverage Docker layer caching.
# Dependencies will only be re-installed when package.json or package-lock.json change.
COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build the Application
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application source code
COPY . .

# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# =============================================================================
# Stage 3: Production Runner
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user and group for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder (static assets like logo.jpeg)
COPY --from=builder /app/public ./public

# Set the correct permissions for the .next cache directory.
# The standalone server needs to write to .next/cache at runtime.
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the standalone server and static assets from the builder stage.
# The standalone output includes a minimal server.js and only the necessary node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user
USER nextjs

# Expose the port Next.js listens on
EXPOSE 3000

# Set the hostname to listen on all network interfaces inside the container
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the standalone Next.js server
CMD ["node", "server.js"]
