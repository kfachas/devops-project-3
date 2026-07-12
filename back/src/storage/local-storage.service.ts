import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { StorageService } from './storage.service';

export class LocalStorageService extends StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    super();
    this.root = config.get<string>('STORAGE_PATH') ?? './storage';
  }

  private resolve(key: string): string {
    return join(this.root, key);
  }

  async save(tempPath: string, key: string): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const dest = this.resolve(key);
    if (tempPath !== dest) {
      await rename(tempPath, dest);
    }
  }

  async read(key: string): Promise<Readable> {
    return createReadStream(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    const path = this.resolve(key);
    if (existsSync(path)) {
      await unlink(path);
    }
  }
}
