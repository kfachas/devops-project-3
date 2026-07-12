import { StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

describe('FilesController', () => {
  let controller: FilesController;
  const files = {
    upload: jest.fn(),
    history: jest.fn(),
    metadata: jest.fn(),
    verifyPassword: jest.fn(),
    resolveForDownload: jest.fn(),
    streamFor: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: FilesService, useValue: files }],
    }).compile();
    controller = moduleRef.get(FilesController);
  });

  it('upload transmet le fichier, le dto et l’utilisateur optionnel', async () => {
    const file = { originalname: 'a.txt' };
    files.upload.mockResolvedValue({ downloadToken: 't' });

    await controller.upload(file as never, { expiresInDays: 3 }, { userId: 'u1', email: 'a@b.fr' });
    expect(files.upload).toHaveBeenCalledWith(file, { expiresInDays: 3 }, 'u1');

    await controller.upload(file as never, {}, undefined);
    expect(files.upload).toHaveBeenLastCalledWith(file, {}, undefined);
  });

  it('history transmet l’utilisateur et le filtre tag', async () => {
    files.history.mockResolvedValue([]);
    await controller.history({ userId: 'u1', email: 'a@b.fr' }, 'perso');
    expect(files.history).toHaveBeenCalledWith('u1', 'perso');
  });

  it('metadata interroge le service par token', async () => {
    files.metadata.mockResolvedValue({ originalName: 'a.txt' });
    await expect(controller.metadata('tok')).resolves.toEqual({ originalName: 'a.txt' });
  });

  it('verify renvoie la validité du mot de passe', async () => {
    files.verifyPassword.mockResolvedValue(true);
    await expect(controller.verify('tok', { password: 'secret123' })).resolves.toEqual({
      valid: true,
    });
  });

  it('download pose les en-têtes et renvoie un StreamableFile', async () => {
    files.resolveForDownload.mockResolvedValue({
      mimeType: 'text/plain',
      originalName: 'a éé.txt',
      storedPath: '/data/x',
    });
    files.streamFor.mockResolvedValue({ pipe: jest.fn() });
    const res = { set: jest.fn() } as unknown as Response;

    const result = await controller.download('tok', res, 'secret123');

    expect(files.resolveForDownload).toHaveBeenCalledWith('tok', 'secret123');
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'text/plain' }),
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('remove restreint la suppression à l’utilisateur courant', async () => {
    files.remove.mockResolvedValue(undefined);
    await controller.remove('f1', { userId: 'u1', email: 'a@b.fr' });
    expect(files.remove).toHaveBeenCalledWith('f1', 'u1');
  });
});
