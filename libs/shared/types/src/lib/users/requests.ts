import { UserRole, KYCStatus } from '@card-hive/shared-database';
import { SORT_ORDER } from '../common.js';

export const CreateUserRole = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;
export type CreateUserRole = keyof typeof CreateUserRole;

export const USERS_SORT_OPTIONS = {
  FULL_NAME: 'fullName',
  CREATED_AT: 'createdAt',
  WALLET_BALANCE: 'walletBalance',
  EMAIL: 'email',
  PHONE: 'phone'
}
export type USERS_SORT_OPTIONS = (typeof USERS_SORT_OPTIONS)[keyof typeof USERS_SORT_OPTIONS];

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
  isDeleted?: boolean;
  sortBy?: USERS_SORT_OPTIONS;
  sortOrder?: SORT_ORDER;
}
