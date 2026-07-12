import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TasksService } from './tasks.service';

describe('TasksService — purge automatique (US10)', () => {
  let service: TasksService;
  const prisma = { file: { findMany: jest.fn(), deleteMany: jest.fn() } };
  const storage = { remove: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  it('supprime les binaires expirés puis leurs métadonnées', async () => {
    prisma.file.findMany.mockResolvedValue([
      { storedPath: '/data/a' },
      { storedPath: '/data/b' },
    ]);
    prisma.file.deleteMany.mockResolvedValue({ count: 2 });

    const count = await service.purgeExpired();

    expect(storage.remove).toHaveBeenCalledTimes(2);
    expect(storage.remove).toHaveBeenCalledWith('/data/a');
    expect(storage.remove).toHaveBeenCalledWith('/data/b');
    const where = prisma.file.deleteMany.mock.calls[0][0].where;
    expect(where.expiresAt.lte).toBeInstanceOf(Date);
    expect(count).toBe(2);
  });

  it('ne fait rien quand aucun fichier n’est expiré', async () => {
    prisma.file.findMany.mockResolvedValue([]);
    prisma.file.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.purgeExpired()).resolves.toBe(0);
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
