/*
  Warnings:

  - The values [MARKETPLACE_SALE,MARKETPLACE_PURCHASE] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[serial_number]` on the table `cards` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pack_id` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sport_type` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `net_amount` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PackType" AS ENUM ('DRAFT', 'PRO', 'ALL_STARS', 'HALL_OF_FAME', 'LEGENDS');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('FOOTBALL', 'BASEBALL', 'BASKETBALL', 'MULTISPORT');

-- CreateEnum
CREATE TYPE "CardLocation" AS ENUM ('VAULT', 'PENDING_SHIP', 'SHIPPED');

-- CreateEnum
CREATE TYPE "CardCondition" AS ENUM ('MINT', 'NEAR_MINT');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('FIXED_PRICE', 'CARD_HIVE_BUYBACK');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('ACTIVE', 'OUTBID', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PACK_PURCHASE', 'TRADE_SALE', 'TRADE_PURCHASE', 'AUCTION_SALE', 'AUCTION_PURCHASE');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "banner_url" VARCHAR(500),
ADD COLUMN     "condition" "CardCondition",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimated_value" DECIMAL(10,2),
ADD COLUMN     "image_url" VARCHAR(500),
ADD COLUMN     "manufacturer" VARCHAR(100),
ADD COLUMN     "pack_id" UUID NOT NULL,
ADD COLUMN     "player_name" TEXT,
ADD COLUMN     "serial_number" VARCHAR(50),
ADD COLUMN     "sport_type" "SportType" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "location" "CardLocation" NOT NULL DEFAULT 'VAULT',
ADD COLUMN     "shipped_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "net_amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "payment_method" VARCHAR(100),
ADD COLUMN     "reference_id" UUID,
ADD COLUMN     "reference_type" VARCHAR(50);

-- CreateTable
CREATE TABLE "packs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pack_type" "PackType" NOT NULL,
    "sport_type" "SportType" NOT NULL,
    "image_url" VARCHAR(500),
    "banner_url" VARCHAR(500),
    "description" TEXT,
    "price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "buyer_id" UUID,
    "type" "TradeType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "starting_price" DECIMAL(10,2) NOT NULL,
    "reserve_price" DECIMAL(10,2),
    "current_price" DECIMAL(10,2) NOT NULL,
    "winning_bid_id" UUID,
    "status" "AuctionStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" VARCHAR(20) NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "phone" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "shipping_address_id" UUID NOT NULL,
    "status" "ShippingStatus" NOT NULL DEFAULT 'PENDING',
    "carrier" VARCHAR(100),
    "tracking_number" VARCHAR(100),
    "estimated_delivery" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,
    "cost" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "packs_pack_type_idx" ON "packs"("pack_type");

-- CreateIndex
CREATE INDEX "packs_sport_type_idx" ON "packs"("sport_type");

-- CreateIndex
CREATE INDEX "packs_is_active_idx" ON "packs"("is_active");

-- CreateIndex
CREATE INDEX "trades_seller_id_idx" ON "trades"("seller_id");

-- CreateIndex
CREATE INDEX "trades_buyer_id_idx" ON "trades"("buyer_id");

-- CreateIndex
CREATE INDEX "trades_inventory_item_id_idx" ON "trades"("inventory_item_id");

-- CreateIndex
CREATE INDEX "trades_status_idx" ON "trades"("status");

-- CreateIndex
CREATE INDEX "trades_type_idx" ON "trades"("type");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_winning_bid_id_key" ON "auctions"("winning_bid_id");

-- CreateIndex
CREATE INDEX "auctions_seller_id_idx" ON "auctions"("seller_id");

-- CreateIndex
CREATE INDEX "auctions_inventory_item_id_idx" ON "auctions"("inventory_item_id");

-- CreateIndex
CREATE INDEX "auctions_status_idx" ON "auctions"("status");

-- CreateIndex
CREATE INDEX "auctions_end_time_idx" ON "auctions"("end_time");

-- CreateIndex
CREATE INDEX "bids_auction_id_idx" ON "bids"("auction_id");

-- CreateIndex
CREATE INDEX "bids_bidder_id_idx" ON "bids"("bidder_id");

-- CreateIndex
CREATE INDEX "bids_status_idx" ON "bids"("status");

-- CreateIndex
CREATE INDEX "bids_created_at_idx" ON "bids"("created_at");

-- CreateIndex
CREATE INDEX "shipping_addresses_user_id_idx" ON "shipping_addresses"("user_id");

-- CreateIndex
CREATE INDEX "shipping_addresses_user_id_is_default_idx" ON "shipping_addresses"("user_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_user_id_idx" ON "shipments"("user_id");

-- CreateIndex
CREATE INDEX "shipments_inventory_item_id_idx" ON "shipments"("inventory_item_id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "cards_serial_number_key" ON "cards"("serial_number");

-- CreateIndex
CREATE INDEX "cards_pack_id_idx" ON "cards"("pack_id");

-- CreateIndex
CREATE INDEX "cards_sport_type_idx" ON "cards"("sport_type");

-- CreateIndex
CREATE INDEX "cards_rarity_idx" ON "cards"("rarity");

-- CreateIndex
CREATE INDEX "cards_serial_number_idx" ON "cards"("serial_number");

-- CreateIndex
CREATE INDEX "inventory_items_location_idx" ON "inventory_items"("location");

-- CreateIndex
CREATE INDEX "inventory_items_user_id_location_idx" ON "inventory_items"("user_id", "location");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_reference_id_reference_type_idx" ON "transactions"("reference_id", "reference_type");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winning_bid_id_fkey" FOREIGN KEY ("winning_bid_id") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "shipping_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
