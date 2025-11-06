import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthorisedUser } from '../types.js';


export const AuthorisedUser = createParamDecorator(
  (data: keyof IAuthorisedUser, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: IAuthorisedUser = request.user;

    if (data) {
      return user?.[data];
    }

    return { ...user, id: user.sub };
  },
);
