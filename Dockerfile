FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

FROM base AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm build:standalone

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs hermes \
  && mkdir -p /data/state/coding \
  && chown -R hermes:nodejs /app /data
COPY --from=builder --chown=hermes:nodejs /app/.next/standalone ./
COPY --from=builder --chown=hermes:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=hermes:nodejs /app/public ./public
USER hermes
EXPOSE 3000
CMD ["node", "server.js"]
