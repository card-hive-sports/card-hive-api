import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthorisedUser } from '../types.js';


export const AuthorisedUser = createParamDecorator(
  (key: keyof IAuthorisedUser, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: IAuthorisedUser = request.user;

    if (key) {
      return user?.[key];
    }

    return { ...user };
  },
);
