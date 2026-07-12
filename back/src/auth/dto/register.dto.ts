import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { USER_PASSWORD_MIN_LENGTH } from '@datashare/shared';

export class RegisterDto {
  @ApiProperty({ example: 'user@datashare.app' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: USER_PASSWORD_MIN_LENGTH, example: 'motdepasse123' })
  @IsString()
  @MinLength(USER_PASSWORD_MIN_LENGTH)
  password!: string;
}
