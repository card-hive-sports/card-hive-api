#!/bin/sh
set -e

pnpm dlx prisma generate --schema=./libs/shared/database/prisma/schema.prisma
pnpm dlx prisma migrate deploy --schema=./libs/shared/database/prisma/schema.prisma

exec node dist/main.js
