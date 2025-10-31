FROM docker.io/node:lts-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NX_DAEMON=false

WORKDIR /app

COPY tsconfig.base.json tsconfig.json nx.json eslint.config.mjs ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/shared/database ./libs/shared/database
COPY apps/auth-service ./apps/auth-service

RUN pnpm install --frozen-lockfile
RUN pnpm nx sync

RUN npx prisma generate --schema=./libs/shared/database/prisma/schema.prisma

RUN pnpm nx build auth-service
RUN pnpm nx prune auth-service

FROM docker.io/node:lts-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/apps/auth-service/dist/package.json /app/apps/auth-service/dist/pnpm-lock.yaml ./
COPY --from=builder /app/apps/auth-service/dist ./dist
COPY --from=builder /app/libs/shared/database/prisma ./

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN pnpm install --prod --frozen-lockfile
RUN npx prisma generate --schema=./schema.prisma

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
