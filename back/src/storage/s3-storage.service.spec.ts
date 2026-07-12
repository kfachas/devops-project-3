const mockSend = jest.fn();
const mockDone = jest.fn();
const mockAbort = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  GetObjectCommand: jest.fn((input) => ({ _type: 'Get', input })),
  HeadObjectCommand: jest.fn((input) => ({ _type: 'Head', input })),
  DeleteObjectCommand: jest.fn((input) => ({ _type: 'Delete', input })),
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn(() => ({ done: mockDone, abort: mockAbort })),
}));

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  createReadStream: jest.fn(() => 'FAKE_STREAM'),
}));

jest.mock('node:fs/promises', () => ({
  ...jest.requireActual('node:fs/promises'),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'node:fs/promises';
import { S3StorageService } from './s3-storage.service';

const configWith = (values: Record<string, string> = {}): ConfigService =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('S3StorageService', () => {
  const service = (): S3StorageService =>
    new S3StorageService(
      configWith({
        S3_BUCKET: 'datashare',
        S3_REGION: 'eu-west-1',
        S3_ENDPOINT: 'http://localstack:4566',
        S3_FORCE_PATH_STYLE: 'true',
        AWS_ACCESS_KEY_ID: 'k',
        AWS_SECRET_ACCESS_KEY: 's',
      }),
    );

  beforeEach(() => jest.clearAllMocks());

  it('save téléverse le fichier vers le bucket', async () => {
    mockDone.mockResolvedValue({});
    await service().save('/tmp/staging/up.txt', 'key-1.txt');
    expect(Upload).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Bucket: 'datashare', Key: 'key-1.txt' }),
      }),
    );
    expect(mockDone).toHaveBeenCalled();
  });

  it('save annule l’upload et nettoie le fichier temporaire si done() échoue', async () => {
    mockDone.mockRejectedValue(new Error('S3 indisponible'));
    mockAbort.mockResolvedValue(undefined);
    await expect(service().save('/tmp/staging/up.txt', 'key-1.txt')).rejects.toThrow('S3 indisponible');
    expect(mockAbort).toHaveBeenCalled();
    expect(unlink).toHaveBeenCalledWith('/tmp/staging/up.txt');
  });

  it('read renvoie le corps renvoyé par S3', async () => {
    const body = { stream: true };
    mockSend.mockResolvedValue({ Body: body });
    await expect(service().read('key-1.txt')).resolves.toBe(body);
    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'datashare', Key: 'key-1.txt' });
  });

  it('exists = true si HeadObject réussit, false s’il échoue', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(service().exists('key-1.txt')).resolves.toBe(true);
    mockSend.mockRejectedValueOnce(new Error('NotFound'));
    await expect(service().exists('absent')).resolves.toBe(false);
  });

  it('remove envoie un DeleteObjectCommand', async () => {
    mockSend.mockResolvedValue({});
    await service().remove('key-1.txt');
    expect(DeleteObjectCommand).toHaveBeenCalledWith({ Bucket: 'datashare', Key: 'key-1.txt' });
  });

  it('applique des valeurs par défaut en l’absence de configuration', () => {
    expect(() => new S3StorageService(configWith())).not.toThrow();
  });
});
