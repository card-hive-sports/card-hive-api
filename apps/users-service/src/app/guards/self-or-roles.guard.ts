import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAuthorisedUser } from '@card-hive/shared-auth';

@Injectable()
export class SelfOrRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: IAuthorisedUser = request.user;
    const userIDParam = request.params.id;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.id === userIDParam) {
      return true;
    }

    const allowedRoles = this.reflector.get<string[]>('roles', context.getHandler()) ?? [];

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('Not allowed to access this resource');
  }
}
