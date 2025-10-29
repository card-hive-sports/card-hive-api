import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class PhoneLoginRequestDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phone: string;
}

export class PhoneLoginVerifyDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}
