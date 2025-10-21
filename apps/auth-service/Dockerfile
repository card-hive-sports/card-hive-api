FROM docker.io/node:lts-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NX_DAEMON=false

WORKDIR /app

COPY tsconfig.base.json tsconfig.json nx.json eslint.config.mjs ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/shared/database ./libs/shared/database
COPY apps/auth-service/ ./apps/auth-service/

RUN pnpm install --frozen-lockfile
RUN pnpm nx sync
RUN pnpm nx build auth-service

FROM docker.io/node:lts-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/apps/auth-service ./apps/auth-service
COPY --from=builder /app/libs/shared/database ./libs/shared/database

COPY apps/auth-service/package.json ./
COPY pnpm-workspace.yaml ./

RUN pnpm install --prod

CMD [ "node", "apps/auth-service/dist/main.js" ]
