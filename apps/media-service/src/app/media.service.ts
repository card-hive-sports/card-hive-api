import { unlink } from 'node:fs/promises';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Prisma, MediaFileStatus, MediaFile } from '@prisma/client';
import { PrismaService } from '@card-hive/shared-database';
import {
  CreateMediaUploadPayload,
  FindMediaFilesQuery,
  MediaFileProgressResponse,
  MediaFileResponse,
} from '@card-hive/shared-types';
import { MediaProgressCache } from './cache/media-progress.cache';
import { MediaUploadQueue } from './queues/media-upload.queue';
import { buildKey, toProgressSnapshot } from './utils/media-upload.utils';
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

  constructor(
    @Inject(mediaConfig.KEY)
    private readonly config: ConfigType<typeof mediaConfig>,
    private readonly prisma: PrismaService,
    private readonly cache: MediaProgressCache,
    private readonly queue: MediaUploadQueue
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    payload: CreateMediaUploadPayload,
    userID?: string
  ): Promise<MediaFileResponse> {
    const key = buildKey(file.originalname, payload.folder);
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
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const initialSnapshot = toProgressSnapshot({
      id: record.id,
      bucket: record.bucket,
      key: record.key,
      url: record.url ?? null,
      status: record.status,
      progress: record.progress,
      updatedAt: record.updatedAt,
    });

    await this.cache.set(initialSnapshot);

    try {
      await this.queue.enqueue({
        mediaFileId: record.id,
        filePath: file.path,
        fileName: file.originalname,
        mimetype: file.mimetype,
        size: file.size ?? Number(record.size ?? 0n),
      });
    } catch (error) {
      this.logger.error('Failed to queue media upload job', error as Error);

      await this.prisma.mediaFile.update({
        where: { id: record.id },
        data: {
          status: MediaFileStatus.FAILED,
        },
      });

      const failedSnapshot = toProgressSnapshot({
        id: record.id,
        bucket: record.bucket,
        key: record.key,
        url: record.url ?? null,
        status: MediaFileStatus.FAILED,
        progress: record.progress,
        updatedAt: new Date(),
      });

      await this.cache.set(failedSnapshot);
      await this.safeUnlink(file.path);
      throw new InternalServerErrorException('Failed to queue media upload job.');
    }

    return this.toResponse(record);
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
    const cached = await this.cache.get(id);
    if (cached) {
      return cached;
    }

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

    const snapshot = toProgressSnapshot({
      id: file.id,
      bucket: file.bucket,
      key: file.key,
      url: file.url ?? null,
      status: file.status,
      progress: file.progress,
      updatedAt: file.updatedAt,
    });

    void this.cache.set(snapshot);

    return snapshot;
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

  private async safeUnlink(filePath: string) {
    await unlink(filePath).catch();
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
