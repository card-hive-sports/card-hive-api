/*
  Warnings:

  - Added the required column `session_id` to the `login_activities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "login_activities" ADD COLUMN     "session_id" TEXT NOT NULL;
