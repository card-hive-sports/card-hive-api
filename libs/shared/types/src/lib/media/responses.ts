import { MediaFileStatus } from '@prisma/client';

export interface MediaFileUserSnapshot {
  id: string;
  fullName: string;
}

export interface MediaFileResponse {
  id: string;
  bucket: string;
  key: string;
  url?: string | null;
  fileName: string;
  contentType: string;
  size: number;
  status: MediaFileStatus;
  progress: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  user: MediaFileUserSnapshot | null;
}

export interface MediaFileProgressResponse {
  id: string;
  status: MediaFileStatus;
  progress: number;
  bucket: string;
  key: string;
  url?: string | null;
  updatedAt: Date;
}
