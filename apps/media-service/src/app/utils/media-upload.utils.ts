import { randomUUID } from 'node:crypto';
import { ConfigType } from '@nestjs/config';
import { MediaFileStatus } from '@prisma/client';
import { MediaFileProgressResponse } from '@card-hive/shared-types';
import { mediaConfig } from '../config/media.config';

export function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function normalizeFolder(folder?: string) {
  if (!folder) {
    return 'uploads';
  }

  const segments = folder
    .split('/')
    .map(sanitizeSegment)
    .filter(Boolean);

  if (segments.length === 0) {
    return 'uploads';
  }

  return segments.join('/');
}

export function buildKey(fileName: string, folder?: string) {
  const fileSegment = sanitizeSegment(fileName);
  const suffix = fileSegment.length > 0 ? `-${fileSegment}` : '';
  const baseFolder = normalizeFolder(folder);
  return `${baseFolder}/${randomUUID()}${suffix}`;
}

export function buildUrl(config: ConfigType<typeof mediaConfig>, key: string) {
  const base = config.s3.endpoint
    ? config.s3.endpoint.replace(/\/$/, '')
    : `https://${config.s3.bucketName}.s3.${config.s3.region}.amazonaws.com`;
  return `${base}/${key}`;
}

export function calculatePercent(loaded: number, total: number) {
  if (total <= 0) {
    return undefined;
  }
  const percent = Math.floor((loaded / total) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function toS3Metadata(metadata?: Record<string, unknown> | null) {
  if (!metadata) {
    return undefined;
  }

  return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    acc[key] =
      typeof value === 'string'
        ? value
        : JSON.stringify(value, (_, v) => (v === undefined ? null : v));
    return acc;
  }, {});
}

export function toProgressSnapshot(args: {
  id: string;
  status: MediaFileStatus;
  progress: number;
  bucket: string;
  key: string;
  url?: string | null;
  updatedAt: Date;
}): MediaFileProgressResponse {
  return {
    id: args.id,
    status: args.status,
    progress: args.progress,
    bucket: args.bucket,
    key: args.key,
    url: args.url ?? null,
    updatedAt: args.updatedAt,
  };
}
