FROM docker.io/node:lts-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

ARG SERVICE_NAME
ENV NX_DAEMON=false

WORKDIR /app

COPY tsconfig.base.json tsconfig.json nx.json eslint.config.mjs ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs ./libs
COPY apps/${SERVICE_NAME} ./apps/${SERVICE_NAME}

RUN pnpm install --frozen-lockfile
RUN pnpm nx sync

RUN npx prisma generate --schema=./libs/shared/database/prisma/schema.prisma

RUN pnpm nx build ${SERVICE_NAME}

FROM docker.io/node:lts-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate

ARG SERVICE_NAME
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/${SERVICE_NAME}/dist/package.json ./
COPY --from=builder /app/apps/${SERVICE_NAME}/dist ./dist
COPY --from=builder /app/libs/shared ./libs/shared

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN pnpm install --prod --ignore-scripts

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
