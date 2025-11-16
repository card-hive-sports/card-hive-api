/*
  Warnings:

  - A unique constraint covering the columns `[pack_type,sport_type]` on the table `packs` will be added. If there are existing duplicate values, this will fail.
  - Made the column `banner_url` on table `cards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `image_url` on table `cards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `serial_number` on table `cards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `image_url` on table `packs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `banner_url` on table `packs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price` on table `packs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "cards" ALTER COLUMN "banner_url" SET NOT NULL,
ALTER COLUMN "image_url" SET NOT NULL,
ALTER COLUMN "serial_number" SET NOT NULL;

-- AlterTable
ALTER TABLE "packs" ALTER COLUMN "image_url" SET NOT NULL,
ALTER COLUMN "banner_url" SET NOT NULL,
ALTER COLUMN "price" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "packs_pack_type_sport_type_key" ON "packs"("pack_type", "sport_type");
