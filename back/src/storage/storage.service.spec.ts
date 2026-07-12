import { ConfigService } from '@nestjs/config';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-storage-'));
  const config = { get: () => root } as unknown as ConfigService;
  const service = new LocalStorageService(config);

  const stage = (name: string, content: string): string => {
    const tmp = join(root, name);
    writeFileSync(tmp, content);
    return tmp;
  };

  it('save déplace le fichier temporaire vers la clé, puis read renvoie le contenu', async () => {
    const tmp = stage('tmp-1', 'contenu');
    await service.save(tmp, 'object-1.txt');
    expect(existsSync(tmp)).toBe(false);
    const stream = await service.read('object-1.txt');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    expect(Buffer.concat(chunks).toString()).toBe('contenu');
  });

  it('save est idempotent quand le fichier est déjà à la clé', async () => {
    const dest = join(root, 'already.txt');
    writeFileSync(dest, 'present');
    await service.save(dest, 'already.txt');
    await expect(service.exists('already.txt')).resolves.toBe(true);
  });

  it('exists reflète la présence de la clé', async () => {
    const tmp = stage('tmp-2', 'x');
    await service.save(tmp, 'object-2.bin');
    await expect(service.exists('object-2.bin')).resolves.toBe(true);
    await expect(service.exists('absent.bin')).resolves.toBe(false);
  });

  it('remove supprime la clé et tolère une clé absente', async () => {
    const tmp = stage('tmp-3', 'x');
    await service.save(tmp, 'object-3.bin');
    await service.remove('object-3.bin');
    await expect(service.exists('object-3.bin')).resolves.toBe(false);
    await expect(service.remove('object-3.bin')).resolves.toBeUndefined();
  });

  it('utilise ./storage par défaut en l’absence de STORAGE_PATH', () => {
    expect(
      () => new LocalStorageService({ get: () => undefined } as unknown as ConfigService),
    ).not.toThrow();
  });
});
