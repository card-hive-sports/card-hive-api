import { IsOptional, IsInt, Min, Max, IsString, IsEnum, IsBoolean, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { GetUsersQueryParams, SORT_ORDER, USERS_SORT_OPTIONS } from '@card-hive/shared-types';
import { UserRole, KYCStatus } from '@card-hive/shared-database';

export class GetUsersQueryDto implements GetUsersQueryParams {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ enum: KYCStatus, required: false })
  @IsOptional()
  @IsEnum(KYCStatus)
  kycStatus?: KYCStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform((v) => v.value === 'false' ? false : (v.value === 'true' ? true : v.value))
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform((v) => v.value === 'false' ? false : (v.value === 'true' ? true : v.value))
  @IsBoolean()
  isDeleted?: boolean;

  @ApiProperty({
    required: false,
    enum: USERS_SORT_OPTIONS,
    default: USERS_SORT_OPTIONS.CREATED_AT
  })
  @IsOptional()
  @IsEnum(USERS_SORT_OPTIONS)
  sortBy?: USERS_SORT_OPTIONS = USERS_SORT_OPTIONS.CREATED_AT;

  @ApiProperty({
    required: false,
    enum: SORT_ORDER,
    default: SORT_ORDER.DESC
  })
  @IsOptional()
  @IsEnum(SORT_ORDER)
  sortOrder?: SORT_ORDER = SORT_ORDER.DESC;

  @ApiProperty({
    required: false,
    description: 'Filter users created on or after this date',
    type: String,
    format: 'date-time'
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({
    required: false,
    description: 'Filter users created on or before this date',
    type: String,
    format: 'date-time'
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
