import { IsEmail, IsString, IsDateString, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserRequest, CreateUserRole } from '@card-hive/shared-types';

export class CreateUserDto implements CreateUserRequest {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be valid E.164 format' })
  phone?: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: CreateUserRole, default: CreateUserRole.CUSTOMER, required: false })
  @IsOptional()
  @IsEnum(CreateUserRole)
  role?: CreateUserRole;
}
