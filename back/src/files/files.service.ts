import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import { DEFAULT_EXPIRY_DAYS, FORBIDDEN_FILE_EXTENSIONS, TAG_MAX_LENGTH } from '@datashare/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FileMetadataDto, FileSummaryDto, UploadResultDto } from './dto/file-response.dto';
import { UploadFileDto } from './dto/upload-file.dto';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  filename: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async upload(file: UploadedFile, dto: UploadFileDto, userId?: string): Promise<UploadResultDto> {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }
    const ext = extname(file.originalname).replace('.', '').toLowerCase();
    if ((FORBIDDEN_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
      await unlink(file.path).catch(() => undefined);
      throw new ForbiddenException(`Extension interdite : .${ext}`);
    }

    let labels: string[];
    try {
      labels = this.parseTags(dto.tags);
    } catch (err) {
      await unlink(file.path).catch(() => undefined);
      throw err;
    }

    const days = dto.expiresInDays ?? DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + days * DAY_MS);
    const downloadToken = randomBytes(24).toString('base64url');
    const passwordHash = dto.password ? await hash(dto.password) : null;

    await this.storage.save(file.path, file.filename);

    const created = await this.prisma.file
      .create({
        data: {
          ownerId: userId ?? null,
          originalName: file.originalname,
          storedPath: file.filename,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
          downloadToken,
          passwordHash,
          expiresAt,
          tags: {
            create: labels.map((label) => ({
              tag: { connectOrCreate: { where: { label }, create: { label } } },
            })),
          },
        },
      })
      .catch(async (err) => {
        await this.storage.remove(file.filename).catch(() => undefined);
        throw err;
      });

    return {
      downloadToken: created.downloadToken,
      downloadUrl: `${this.frontUrl()}/d/${created.downloadToken}`,
      originalName: created.originalName,
      sizeBytes: Number(created.sizeBytes),
      mimeType: created.mimeType,
      expiresAt: created.expiresAt.toISOString(),
      passwordProtected: created.passwordHash !== null,
      tags: labels,
    };
  }

  async history(userId: string, tag?: string): Promise<FileSummaryDto[]> {
    const files = await this.prisma.file.findMany({
      where: {
        ownerId: userId,
        ...(tag ? { tags: { some: { tag: { label: tag } } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { tags: { include: { tag: true } } },
    });
    return files.map((file) => this.toSummary(file));
  }

  async metadata(token: string): Promise<FileMetadataDto> {
    const file = await this.findValid(token);
    return {
      originalName: file.originalName,
      sizeBytes: Number(file.sizeBytes),
      mimeType: file.mimeType,
      expiresAt: file.expiresAt.toISOString(),
      passwordProtected: file.passwordHash !== null,
    };
  }

  async verifyPassword(token: string, password: string): Promise<boolean> {
    const file = await this.findValid(token);
    if (!file.passwordHash) {
      return true;
    }
    return verify(file.passwordHash, password);
  }

  async resolveForDownload(token: string, password?: string) {
    const file = await this.findValid(token);
    if (file.passwordHash) {
      if (!password || !(await verify(file.passwordHash, password))) {
        throw new ForbiddenException('Mot de passe requis ou invalide');
      }
    }
    if (!(await this.storage.exists(file.storedPath))) {
      throw new NotFoundException('Fichier introuvable');
    }
    return file;
  }

  streamFor(storedPath: string): Promise<Readable> {
    return this.storage.read(storedPath);
  }

  async remove(id: string, userId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file || file.ownerId !== userId) {
      throw new NotFoundException('Fichier introuvable');
    }
    await this.prisma.file.delete({ where: { id } });
    await this.storage.remove(file.storedPath).catch(() => undefined);
  }

  private async findValid(token: string) {
    const file = await this.prisma.file.findUnique({ where: { downloadToken: token } });
    if (!file) {
      throw new NotFoundException('Lien invalide');
    }
    if (file.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Ce lien a expiré');
    }
    return file;
  }

  private parseTags(raw?: string): string[] {
    if (!raw) {
      return [];
    }
    const labels = [
      ...new Set(
        raw
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
    if (labels.some((label) => label.length > TAG_MAX_LENGTH)) {
      throw new BadRequestException(`Chaque tag est limité à ${TAG_MAX_LENGTH} caractères`);
    }
    return labels;
  }

  private frontUrl(): string {
    return this.config.get<string>('FRONT_URL') ?? 'http://localhost:4200';
  }

  private toSummary(file: {
    id: string;
    originalName: string;
    sizeBytes: bigint;
    mimeType: string;
    downloadToken: string;
    expiresAt: Date;
    createdAt: Date;
    passwordHash: string | null;
    tags: { tag: { label: string } }[];
  }): FileSummaryDto {
    return {
      id: file.id,
      originalName: file.originalName,
      sizeBytes: Number(file.sizeBytes),
      mimeType: file.mimeType,
      downloadToken: file.downloadToken,
      expiresAt: file.expiresAt.toISOString(),
      createdAt: file.createdAt.toISOString(),
      passwordProtected: file.passwordHash !== null,
      status: file.expiresAt.getTime() <= Date.now() ? 'expired' : 'active',
      tags: file.tags.map((link) => link.tag.label),
    };
  }
}
