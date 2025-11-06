#!/bin/sh
set -e

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

pnpm dlx prisma generate --schema=./libs/shared/database/prisma/schema.prisma
pnpm dlx prisma migrate deploy --schema=./libs/shared/database/prisma/schema.prisma

exec node dist/main.js
