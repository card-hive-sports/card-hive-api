/*
  Warnings:

  - The primary key for the `auth_provider_links` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `refresh_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `auth_provider_links` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `auth_provider_links` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `refresh_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `refresh_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."auth_provider_links" DROP CONSTRAINT "auth_provider_links_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "auth_provider_links" DROP CONSTRAINT "auth_provider_links_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "auth_provider_links_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "login_activities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "login_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "device_type" VARCHAR(50),
    "platform" VARCHAR(50),
    "browser" VARCHAR(50),
    "login_method" "AuthProvider" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" VARCHAR(255),

    CONSTRAINT "login_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_activities_user_id_idx" ON "login_activities"("user_id");

-- CreateIndex
CREATE INDEX "login_activities_user_id_login_at_idx" ON "login_activities"("user_id", "login_at");

-- CreateIndex
CREATE INDEX "login_activities_login_at_idx" ON "login_activities"("login_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "auth_provider_links" ADD CONSTRAINT "auth_provider_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_activities" ADD CONSTRAINT "login_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
