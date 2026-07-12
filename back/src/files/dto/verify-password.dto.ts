import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyPasswordDto {
  @ApiProperty()
  @IsString()
  password!: string;
}
