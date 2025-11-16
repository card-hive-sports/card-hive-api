/*
  Warnings:

  - You are about to drop the column `name` on the `packs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."inventory_items" DROP CONSTRAINT "inventory_items_user_id_fkey";

-- AlterTable
ALTER TABLE "inventory_items" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "packs" DROP COLUMN "name";

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
