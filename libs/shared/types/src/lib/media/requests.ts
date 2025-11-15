import { MediaFileStatus } from '@prisma/client';

export interface CreateMediaUploadPayload {
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  folder?: string;
}

export interface FindMediaFilesQuery {
  page?: number;
  limit?: number;
  status?: MediaFileStatus;
  fileName?: string;
  contentType?: string;
  userID?: string;
  createdAfter?: string;
  createdBefore?: string;
  sizeMin?: number;
  sizeMax?: number;
  order?: 'asc' | 'desc';
}
