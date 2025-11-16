import { createReadStream } from 'fs';
import { unlink } from 'node:fs/promises';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import Bull, { Job, Queue } from 'bull';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { MediaFileStatus } from '@prisma/client';
import { PrismaService } from '@card-hive/shared-database';
import { mediaConfig } from '../config/media.config';
import { MediaProgressCache } from '../cache/media-progress.cache';
import {
  buildUrl,
  calculatePercent,
  toProgressSnapshot,
  toS3Metadata,
} from '../utils/media-upload.utils';

export interface MediaUploadJobData {
  mediaFileId: string;
  filePath: string;
  fileName: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class MediaUploadQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaUploadQueue.name);
  private queue?: Queue<MediaUploadJobData>;
  private readonly s3Client?: S3Client;

  constructor(
    @Inject(mediaConfig.KEY)
    private readonly config: ConfigType<typeof mediaConfig>,
    private readonly prisma: PrismaService,
    private readonly cache: MediaProgressCache
  ) {
    const redisURL = this.config.redis?.url;

    if (!redisURL) {
      this.logger.warn('Redis URL not configured; media upload queue disabled');
      return;
    }

    const s3Options: S3ClientConfig = {
      region: this.config.s3.region,
      credentials: {
        accessKeyId: this.config.s3.accessKeyID,
        secretAccessKey: this.config.s3.secretAccessKey,
      },
      forcePathStyle: this.config.s3.forcePathStyle,
    };

    // if (this.config.s3.endpoint) {
    //   s3Options.endpoint = this.config.s3.endpoint;
    // }

    this.s3Client = new S3Client(s3Options);
    this.queue = new Bull<MediaUploadJobData>('media-upload', {
      redis: redisURL,
    });
  }

  async onModuleInit() {
    if (!this.queue) {
      return;
    }

    this.queue.process(1, this.handleJob.bind(this));
    this.queue.on('error', (error) => {
      this.logger.error(`Media upload queue error: ${error.message}`);
    });
    this.queue.on('failed', (job, error) => {
      this.logger.error(`Job ${job.id} failed: ${error?.message ?? 'unknown error'}`);
    });
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
    }
  }

  async enqueue(data: MediaUploadJobData) {
    if (!this.queue) {
      throw new Error('Media upload queue is not configured');
    }

    await this.queue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: { age: 3600 }
    });
  }

  private async handleJob(job: Job<MediaUploadJobData>) {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const { mediaFileId, filePath, mimetype, size } = job.data;
    const fileRecord = await this.prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
    });

    if (!fileRecord) {
      this.logger.error(`Media file ${mediaFileId} not found`);
      await unlink(filePath).catch();
      return;
    }

    let lastProgress = fileRecord.progress ?? 0;
    const totalBytes = size || Number(fileRecord.size) || 0;
    const metadata = fileRecord.metadata
      ? (JSON.parse(JSON.stringify(fileRecord.metadata)) as Record<string, unknown>)
      : null;

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.config.s3.bucketName,
        Key: fileRecord.key,
        Body: createReadStream(filePath),
        ContentType: mimetype,
        Metadata: toS3Metadata(metadata),
      },
      queueSize: 3,
      partSize: this.config.upload.partSizeBytes,
    });

    upload.on('httpUploadProgress', async (progress) => {
      const percent = calculatePercent(progress.loaded ?? 0, progress.total ?? totalBytes);

      if (percent === undefined) {
        return;
      }

      if (percent - lastProgress >= 5 || percent === 100) {
        lastProgress = percent;
        const status =
          percent === 100 ? MediaFileStatus.COMPLETED : MediaFileStatus.UPLOADING;

        const progressSnapshot = toProgressSnapshot({
          id: fileRecord.id,
          bucket: fileRecord.bucket,
          key: fileRecord.key,
          url: fileRecord.url ?? null,
          status,
          progress: percent,
          updatedAt: new Date(),
        });

        await this.cache.set(progressSnapshot);
      }
    });

    try {
      const result = await upload.done();
      await unlink(filePath).catch();
      const updated = await this.prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          status: MediaFileStatus.COMPLETED,
          progress: 100,
          eTag: result.ETag ?? undefined,
          url: buildUrl(this.config, fileRecord.key),
          size: BigInt(size || Number(fileRecord.size) || 0),
        },
      });

      const progressSnapshot = toProgressSnapshot({
        id: updated.id,
        bucket: updated.bucket,
        key: updated.key,
        url: updated.url ?? null,
        status: updated.status,
        progress: updated.progress,
        updatedAt: updated.updatedAt,
      });

      await this.cache.set(progressSnapshot);
    } catch (error) {
      this.logger.error(`Media upload job failed for ${mediaFileId}`, error as Error);
      
      if (job.attemptsMade === 2) {
        await unlink(filePath).catch();
      }

      await this.prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          progress: Math.min(100, lastProgress),
          status: MediaFileStatus.FAILED,
        },
      });

      const progressSnapshot = toProgressSnapshot({
        id: fileRecord.id,
        bucket: fileRecord.bucket,
        key: fileRecord.key,
        url: fileRecord.url ?? null,
        status: MediaFileStatus.FAILED,
        progress: Math.min(100, lastProgress),
        updatedAt: new Date(),
      });

      await this.cache.set(progressSnapshot);
      throw error;
    }
  }
}
