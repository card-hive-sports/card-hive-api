import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ResetPasswordRequest } from '@card-hive/shared-types';

export class ResetPasswordDto implements ResetPasswordRequest {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
