# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --omit=dev --prefer-offline --no-audit; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Install build dependencies
FROM base AS build-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then CYPRESS_INSTALL_BINARY=0 npm ci --prefer-offline --no-audit; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=build-deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables for Next.js
ARG NEXT_PUBLIC_AWS_API_ENDPOINT
ARG NEXT_PUBLIC_CLOUDFRONT_DOMAIN
ENV NEXT_PUBLIC_AWS_API_ENDPOINT=$NEXT_PUBLIC_AWS_API_ENDPOINT
ENV NEXT_PUBLIC_CLOUDFRONT_DOMAIN=$NEXT_PUBLIC_CLOUDFRONT_DOMAIN

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during build for faster builds
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Use all available cores for build
RUN npm run build:docker

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_ vars are inlined into client bundle at build time, but server-side
# API routes also need them at runtime (e.g., auth-cookie route, S3 URL transforms).
# These ARGs propagate the build-time values into the runner's environment.
# They can still be overridden by docker-compose environment variables.
ARG NEXT_PUBLIC_AWS_API_ENDPOINT
ARG NEXT_PUBLIC_CLOUDFRONT_DOMAIN
ENV NEXT_PUBLIC_AWS_API_ENDPOINT=$NEXT_PUBLIC_AWS_API_ENDPOINT
ENV NEXT_PUBLIC_CLOUDFRONT_DOMAIN=$NEXT_PUBLIC_CLOUDFRONT_DOMAIN

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]