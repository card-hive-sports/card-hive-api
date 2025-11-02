#!/bin/sh
set -e

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

npx prisma generate --schema=./schema.prisma
npx prisma migrate deploy --schema=./schema.prisma

exec node dist/main.js
