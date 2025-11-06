import { UserRole, KYCStatus } from '@card-hive/shared-database';

export const CreateUserRole = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;
export type CreateUserRole = keyof typeof CreateUserRole;

export interface CreateUserRequest {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  role?: CreateUserRole;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface GetUsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  kycStatus?: KYCStatus;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'fullName' | 'email';
  sortOrder?: 'asc' | 'desc';
}
