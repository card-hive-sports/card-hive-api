import { IsEmail, IsString, IsDateString, IsOptional, Matches, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateUserRequest } from '@card-hive/shared-types';

export class UpdateUserDto implements UpdateUserRequest {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be valid E.164 format' })
  phone?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    example: 'https://cdn.cardhive.com/avatars/john-doe.png',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
