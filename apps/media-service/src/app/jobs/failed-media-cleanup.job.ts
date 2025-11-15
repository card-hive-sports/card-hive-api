import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ConfigType } from '@nestjs/config';
import { DeleteObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { MediaFileStatus } from '@prisma/client';
import { PrismaService } from '@card-hive/shared-database';
import { mediaConfig } from '../config/media.config';

@Injectable()
export class FailedMediaCleanupJob {
  private readonly logger = new Logger(FailedMediaCleanupJob.name);
  private readonly s3Client?: S3Client;

  constructor(
    @Inject(mediaConfig.KEY)
    private readonly config: ConfigType<typeof mediaConfig>,
    private readonly prisma: PrismaService
  ) {
    const { region, accessKeyID, secretAccessKey, endpoint, forcePathStyle } = this.config.s3;

    if (!region || !accessKeyID || !secretAccessKey) {
      this.logger.warn(
        'S3 cleanup client is not configured. Failed media files will still be removed from the database.'
      );
      return;
    }

    const clientConfig: S3ClientConfig = {
      region,
      credentials: {
        accessKeyId: accessKeyID,
        secretAccessKey,
      },
      forcePathStyle,
    };

    if (endpoint) {
      clientConfig.endpoint = endpoint;
    }

    this.s3Client = new S3Client(clientConfig);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupFailedMediaFiles() {
    const failedFiles = await this.prisma.mediaFile.findMany({
      where: { status: MediaFileStatus.FAILED },
      select: {
        bucket: true,
        key: true,
      },
    });

    if (failedFiles.length === 0) {
      this.logger.log('No failed media files found for cleanup');
      return;
    }

    const deletedObjects = await this.deleteS3Objects(failedFiles);

    const deleteResult = await this.prisma.mediaFile.deleteMany({
      where: { status: MediaFileStatus.FAILED },
    });

    this.logger.log(
      `Removed ${deleteResult.count} failed media records` +
        (this.s3Client ? ` and attempted to delete ${deletedObjects} S3 object(s)` : '')
    );
  }

  private async deleteS3Objects(files: { bucket: string; key: string }[]): Promise<number> {
    if (!this.s3Client) {
      return 0;
    }

    const deletions = await Promise.all(
      files.map(async (file) => {
        try {
          await this.s3Client?.send(
            new DeleteObjectCommand({
              Bucket: file.bucket,
              Key: file.key,
            })
          );

          return 1;
        } catch (error) {
          this.logger.warn(
            `Unable to delete ${file.bucket}/${file.key} from S3 during cleanup`,
            error as Error
          );
        }

        return 0;
      })
    );

    return deletions.reduce((total: number, current: number) => total + current, 0);
  }
}
