import { ApiProperty } from '@nestjs/swagger';

export class UploadResultDto {
  @ApiProperty()
  downloadToken!: string;

  @ApiProperty()
  downloadUrl!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty()
  passwordProtected!: boolean;

  @ApiProperty({ type: [String] })
  tags!: string[];
}

export class FileSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  downloadToken!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty()
  passwordProtected!: boolean;

  @ApiProperty({ enum: ['active', 'expired'] })
  status!: 'active' | 'expired';

  @ApiProperty({ type: [String] })
  tags!: string[];
}

export class FileMetadataDto {
  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty()
  passwordProtected!: boolean;
}

export class VerifyPasswordResultDto {
  @ApiProperty()
  valid!: boolean;
}
