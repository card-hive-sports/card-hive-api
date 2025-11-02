/*
  Warnings:

  - You are about to drop the column `session_id` on the `login_activities` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "login_activities" DROP COLUMN "session_id";
