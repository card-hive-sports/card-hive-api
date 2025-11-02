import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsDateString, Matches } from 'class-validator';
import { RegisterRequest } from '@card-hive/shared-types';

export class RegisterDto implements RegisterRequest{
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be valid E.164 format' })
  phone: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  dateOfBirth: string;
}
