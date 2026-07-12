import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { FILE_PASSWORD_MIN_LENGTH, MAX_EXPIRY_DAYS, MIN_EXPIRY_DAYS } from '@datashare/shared';

export class UploadFileDto {
  @ApiPropertyOptional({
    minimum: MIN_EXPIRY_DAYS,
    maximum: MAX_EXPIRY_DAYS,
    default: MAX_EXPIRY_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_EXPIRY_DAYS)
  @Max(MAX_EXPIRY_DAYS)
  expiresInDays?: number;

  @ApiPropertyOptional({ minLength: FILE_PASSWORD_MIN_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(FILE_PASSWORD_MIN_LENGTH)
  password?: string;

  @ApiPropertyOptional({ description: 'Tags séparés par des virgules', example: 'facture,2026' })
  @IsOptional()
  @IsString()
  tags?: string;
}
