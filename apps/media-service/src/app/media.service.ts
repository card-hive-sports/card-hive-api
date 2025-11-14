import { createReadStream } from 'fs';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Prisma, MediaFileStatus, MediaFile } from '@prisma/client';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { PrismaService } from '@card-hive/shared-database';
import {
  CreateMediaUploadPayload,
  FindMediaFilesQuery,
  MediaFileProgressResponse,
  MediaFileResponse,
} from '@card-hive/shared-types';
import { mediaConfig } from './config/media.config';

type MediaWithUser = MediaFile & {
  user?: {
    id: string;
    fullName: string;
  } | null;
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client;

  constructor(
    @Inject(mediaConfig.KEY)
    private readonly config: ConfigType<typeof mediaConfig>,
    private readonly prisma: PrismaService
  ) {
    const s3Options: S3ClientConfig = {
      region: this.config.s3.region,
      credentials: {
        accessKeyId: this.config.s3.accessKeyID,
        secretAccessKey: this.config.s3.secretAccessKey,
      },
      forcePathStyle: this.config.s3.forcePathStyle,
    };

    if (this.config.s3.endpoint) {
      s3Options.endpoint = this.config.s3.endpoint;
    }

    this.s3Client = new S3Client(s3Options);
  }

  async uploadFile(
    file: Express.Multer.File,
    payload: CreateMediaUploadPayload,
    userID?: string
  ): Promise<MediaFileResponse> {
    const key = this.buildKey(file.originalname);
    const metadata = this.mergeMetadata(payload);

    const record = await this.prisma.mediaFile.create({
      data: {
        bucket: this.config.s3.bucketName,
        key,
        fileName: file.originalname,
        contentType: file.mimetype,
        size: BigInt(file.size ?? 0),
        status: MediaFileStatus.INITIALIZED,
        progress: 0,
        metadata: JSON.parse(JSON.stringify(metadata)) ?? undefined,
        userID,
      },
    });

    let lastProgress = 0;
    const totalBytes = file.size || Number(record.size) || 0;

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.config.s3.bucketName,
        Key: key,
        Body: createReadStream(file.path),
        ContentType: file.mimetype,
        Metadata: this.toS3Metadata(metadata),
      },
      queueSize: 3,
      partSize: this.config.upload.partSizeBytes,
    });

    upload.on('httpUploadProgress', (progress) => {
      const percent = this.calculatePercent(
        progress.loaded ?? 0,
        progress.total ?? totalBytes
      );

      if (percent === undefined) {
        return;
      }

      if (percent - lastProgress >= 5 || percent === 100) {
        lastProgress = percent;
        void this.prisma.mediaFile.update({
          where: { id: record.id },
          data: {
            progress: percent,
            status:
              percent === 100 ? MediaFileStatus.COMPLETED : MediaFileStatus.UPLOADING,
          },
        });
      }
    });

    try {
      const result = await upload.done();

      const updated = await this.prisma.mediaFile.update({
        where: { id: record.id },
        data: {
          status: MediaFileStatus.COMPLETED,
          progress: 100,
          eTag: result.ETag ?? undefined,
          url: result.Location ?? this.buildUrl(key),
          size: BigInt(file.size),
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      return this.toResponse(updated);
    } catch (error) {
      this.logger.error('Media upload failed', error);
      await this.prisma.mediaFile.update({
        where: { id: record.id },
        data: {
          progress: Math.min(100, lastProgress),
          status: MediaFileStatus.FAILED,
        },
      });
      throw new InternalServerErrorException('Failed to upload media file.');
    } finally {
      await unlink(file.path).catch();
    }
  }

  async find(query: FindMediaFilesQuery) {
    const where = this.buildFilters(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const order = query.order ?? 'desc';

    const { data, pagination } = await this.prisma.paginate<MediaFile>(
      this.prisma.mediaFile,
      {
        page,
        limit,
        where,
        orderBy: { createdAt: order },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }
    );

    return {
      data: data.map((file) => this.toResponse(file as MediaWithUser)),
      pagination,
    };
  }

  async getByID(id: string): Promise<MediaFileResponse> {
    const file = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('Media file not found.');
    }

    return this.toResponse(file as MediaWithUser);
  }

  async getProgress(id: string): Promise<MediaFileProgressResponse> {
    const file = await this.prisma.mediaFile.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        progress: true,
        bucket: true,
        key: true,
        url: true,
        updatedAt: true,
      },
    });

    if (!file) {
      throw new NotFoundException('Media file not found.');
    }

    return file;
  }

  private buildFilters(query: FindMediaFilesQuery): Prisma.MediaFileWhereInput {
    const where: Prisma.MediaFileWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.fileName) {
      where.fileName = {
        contains: query.fileName,
        mode: 'insensitive',
      };
    }

    if (query.contentType) {
      where.contentType = {
        contains: query.contentType,
        mode: 'insensitive',
      };
    }

    if (query.userID) {
      where.userID = query.userID;
    }

    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (query.createdAfter) {
      createdAtFilter.gte = new Date(query.createdAfter);
    }
    if (query.createdBefore) {
      createdAtFilter.lte = new Date(query.createdBefore);
    }
    if (Object.keys(createdAtFilter).length > 0) {
      where.createdAt = createdAtFilter;
    }

    const sizeFilter: Prisma.BigIntNullableFilter = {};
    if (query.sizeMin !== undefined) {
      sizeFilter.gte = BigInt(Math.floor(query.sizeMin));
    }
    if (query.sizeMax !== undefined) {
      sizeFilter.lte = BigInt(Math.floor(query.sizeMax));
    }
    if (Object.keys(sizeFilter).length > 0) {
      where.size = sizeFilter;
    }

    return where;
  }

  private buildKey(fileName: string) {
    const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const suffix = cleaned.length > 0 ? `-${cleaned}` : '';
    return `uploads/${randomUUID()}${suffix}`;
  }

  private buildUrl(key: string) {
    const base = this.config.s3.endpoint
      ? this.config.s3.endpoint.replace(/\/$/, '')
      : `https://${this.config.s3.bucketName}.s3.${this.config.s3.region}.amazonaws.com`;
    return `${base}/${key}`;
  }

  private calculatePercent(loaded: number, total: number) {
    if (total <= 0) {
      return undefined;
    }
    const percent = Math.floor((loaded / total) * 100);
    return Math.min(100, Math.max(0, percent));
  }

  private mergeMetadata(payload: CreateMediaUploadPayload) {
    const metadata: Record<string, unknown> = {};

    if (payload.title) {
      metadata.title = payload.title;
    }

    if (payload.description) {
      metadata.description = payload.description;
    }

    if (payload.tags && payload.tags.length > 0) {
      metadata.tags = payload.tags;
    }

    if (payload.metadata) {
      Object.assign(metadata, payload.metadata);
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }

  private toS3Metadata(metadata?: Record<string, unknown> | null) {
    if (!metadata) {
      return undefined;
    }

    return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === undefined || value === null) {
        return acc;
      }
      acc[key] =
        typeof value === 'string' ? value : JSON.stringify(value, (_, v) => (v === undefined ? null : v));
      return acc;
    }, {});
  }

  private toResponse(file: MediaWithUser): MediaFileResponse {
    return {
      id: file.id,
      bucket: file.bucket,
      key: file.key,
      url: file.url,
      fileName: file.fileName,
      contentType: file.contentType,
      size: Number(file.size ?? 0n),
      status: file.status,
      progress: file.progress,
      metadata: file.metadata ? JSON.parse(JSON.stringify(file.metadata)) : null,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      user: file.user
        ? {
            id: file.user.id,
            fullName: file.user.fullName,
          }
        : null,
    };
  }
}
