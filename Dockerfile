# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:4000
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NODE_ENV=production
RUN --mount=type=tmpfs,target=/tmp \
  export DATABASE_URL=file:/tmp/build.db PAYLOAD_SECRET=build-only-placeholder \
  && node node_modules/payload/bin.js migrate \
  && pnpm build \
  && rm -f /tmp/build.db /tmp/build.db-wal /tmp/build.db-shm

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data /app/public/media \
  && chown -R node:node /app
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Payload's migration CLI needs dependencies outside the Next.js runtime trace.
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json
USER node
EXPOSE 4000
CMD ["sh", "-c", "node node_modules/payload/bin.js migrate && node server.js"]
