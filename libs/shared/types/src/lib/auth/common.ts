import { UserRole } from '@card-hive/shared-database';

export interface JwtPayload {
  sub: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: UserRole;
}

export interface IAuthorisedUser extends JwtPayload {
  id: string;
}
