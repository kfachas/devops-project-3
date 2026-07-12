import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards';
import {
  FileMetadataDto,
  FileSummaryDto,
  UploadResultDto,
  VerifyPasswordResultDto,
} from './dto/file-response.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { FilesService } from './files.service';
import { MulterExceptionFilter } from './multer-exception.filter';
import { multerOptions } from './multer.config';

interface UploadedMulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  filename: string;
}

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        expiresInDays: { type: 'integer' },
        password: { type: 'string' },
        tags: { type: 'string', description: 'Tags séparés par des virgules' },
      },
    },
  })
  @ApiOkResponse({ type: UploadResultDto })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  upload(
    @UploadedFile() file: UploadedMulterFile,
    @Body() dto: UploadFileDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<UploadResultDto> {
    return this.files.upload(file, dto, user?.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [FileSummaryDto] })
  history(
    @CurrentUser() user: AuthUser,
    @Query('tag') tag?: string,
  ): Promise<FileSummaryDto[]> {
    return this.files.history(user.userId, tag);
  }

  @Get(':token')
  @ApiOkResponse({ type: FileMetadataDto })
  metadata(@Param('token') token: string): Promise<FileMetadataDto> {
    return this.files.metadata(token);
  }

  @Post(':token/verify')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ type: VerifyPasswordResultDto })
  async verify(
    @Param('token') token: string,
    @Body() dto: VerifyPasswordDto,
  ): Promise<VerifyPasswordResultDto> {
    return { valid: await this.files.verifyPassword(token, dto.password) };
  }

  @Get(':token/download')
  @ApiProduces('application/octet-stream')
  @ApiHeader({
    name: 'x-file-password',
    required: false,
    description: 'Mot de passe du fichier protégé (US09) — transmis hors URL',
  })
  @ApiResponse({
    status: 200,
    content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
  })
  async download(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-file-password') password?: string,
  ): Promise<StreamableFile> {
    const file = await this.files.resolveForDownload(token, password);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    });
    return new StreamableFile(await this.files.streamFor(file.storedPath));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.files.remove(id, user.userId);
  }
}
