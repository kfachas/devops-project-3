import type { Readable } from 'node:stream';

export abstract class StorageService {
  abstract save(tempPath: string, key: string): Promise<void>;
  abstract read(key: string): Promise<Readable>;
  abstract exists(key: string): Promise<boolean>;
  abstract remove(key: string): Promise<void>;
}
