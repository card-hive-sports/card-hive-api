FROM docker.io/node:lts-alpine AS builder

ENV NX_DAEMON=false

WORKDIR /app

COPY tsconfig.base.json tsconfig.json nx.json eslint.config.mjs ./
COPY apps/auth-service/ ./apps/auth-service/
COPY libs/shared/database ./libs/shared/database
COPY package.json ./
COPY package-lock.json ./

RUN npm --omit=dev -f install
RUN npm i nx -D
RUN npx nx sync
RUN npx nx build auth-service

FROM docker.io/node:lts-alpine AS runner

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY --from=builder /app/apps/auth-service ./apps/auth-service
COPY --from=builder /app/libs/shared/database ./libs/shared/database
COPY package.json package-lock.json ./

RUN npm --omit=dev -f install

CMD [ "node", "apps/auth-service/dist/main.js" ]
