import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@card-hive/shared-database';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
