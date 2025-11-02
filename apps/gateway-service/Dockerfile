FROM docker.io/node:lts-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NX_DAEMON=false

WORKDIR /app

COPY tsconfig.base.json tsconfig.json nx.json eslint.config.mjs ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
#COPY libs/shared ./libs/shared
COPY apps/gateway-service ./apps/gateway-service

RUN pnpm install --frozen-lockfile
RUN pnpm nx sync

RUN pnpm nx build gateway-service

FROM docker.io/node:lts-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate

ARG SERVICE_NAME
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/apps/gateway-service/dist/package.json ./
COPY --from=builder /app/apps/gateway-service/dist ./dist

RUN pnpm install

CMD ["node", "dist/main.js"]
