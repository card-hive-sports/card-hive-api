import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RefreshTokenRequest } from '@card-hive/shared-types';

export class RefreshTokenDto implements RefreshTokenRequest{
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
