import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import {
  GoogleIDTokenRequest,
} from '@card-hive/shared-types';

export class GoogleIDTokenDto implements GoogleIDTokenRequest{
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  idToken: string;
}
