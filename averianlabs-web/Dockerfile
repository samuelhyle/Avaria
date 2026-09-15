# syntax=docker/dockerfile:1.7
# ---- Dependencies (cached) ----------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
COPY package.json pnpm-lock.yaml .npmrc* ./
# `--ignore-scripts` keeps argon2 from trying to compile native bindings
# against the host glibc; we install it again inside the build stage where
# the toolchain is fully provisioned.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---- Build --------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Native build deps for argon2 / sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Re-run install *with* scripts now that the toolchain is present so native
# modules can compile against the image's glibc / libstdc++.
RUN pnpm install --frozen-lockfile --offline

# next-intl + sanity + sentry require the env at build time
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET
ARG NEXT_PUBLIC_SANITY_API_VERSION
# Build-time placeholder for the database. Real DATABASE_URL is injected
# at runtime via `docker run -e DATABASE_URL=...`. The placeholder must be a
# syntactically valid URL so Drizzle/Postgres client init doesn't throw.
ARG DATABASE_URL=postgres://build:build@localhost:5432/build
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY} \
    NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST} \
    SENTRY_ORG=${SENTRY_ORG} \
    SENTRY_PROJECT=${SENTRY_PROJECT} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN} \
    NEXT_PUBLIC_SANITY_PROJECT_ID=${NEXT_PUBLIC_SANITY_PROJECT_ID} \
    NEXT_PUBLIC_SANITY_DATASET=${NEXT_PUBLIC_SANITY_DATASET} \
    NEXT_PUBLIC_SANITY_API_VERSION=${NEXT_PUBLIC_SANITY_API_VERSION} \
    DATABASE_URL=${DATABASE_URL}

RUN pnpm build

# ---- Runtime (lean, standalone) ----------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user for runtime
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

# Standalone output + static + public assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public
# Sanity studio assets if they're emitted
COPY --from=builder --chown=nextjs:nodejs /app/sanity        ./sanity

USER nextjs
EXPOSE 3000

# Container-level health probe (no wget/curl in the slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Tini-style init via dumb-init-like behaviour is unnecessary — Node 22
# handles signals correctly. Direct entrypoint keeps the image small.
CMD ["node", "server.js"]