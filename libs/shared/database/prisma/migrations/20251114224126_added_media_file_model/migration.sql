-- CreateEnum
CREATE TYPE "MediaFileStatus" AS ENUM ('INITIALIZED', 'UPLOADING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "media_files" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" BIGINT,
    "status" "MediaFileStatus" NOT NULL DEFAULT 'INITIALIZED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "etag" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_files_user_id_idx" ON "media_files"("user_id");

-- CreateIndex
CREATE INDEX "media_files_status_idx" ON "media_files"("status");

-- CreateIndex
CREATE INDEX "media_files_bucket_key_idx" ON "media_files"("bucket", "key");

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
