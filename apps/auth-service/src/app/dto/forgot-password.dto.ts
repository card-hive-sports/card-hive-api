import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { ForgotPasswordRequest } from '@card-hive/shared-types';

export class ForgotPasswordDto implements ForgotPasswordRequest{
  @ApiProperty()
  @IsEmail()
  email: string;
}
