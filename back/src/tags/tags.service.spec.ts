import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from './tags.service';

describe('TagsService (US08)', () => {
  let service: TagsService;
  const prisma = { fileTag: { findMany: jest.fn() } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TagsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TagsService);
  });

  it('agrège les tags de l’utilisateur avec leur nombre d’occurrences', async () => {
    prisma.fileTag.findMany.mockResolvedValue([
      { tag: { label: 'perso' } },
      { tag: { label: 'perso' } },
      { tag: { label: 'demo' } },
    ]);

    const res = await service.listForUser('user-1');

    expect(prisma.fileTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { file: { ownerId: 'user-1' } } }),
    );
    expect(res).toEqual([
      { label: 'perso', count: 2 },
      { label: 'demo', count: 1 },
    ]);
  });

  it('renvoie une liste vide sans tags', async () => {
    prisma.fileTag.findMany.mockResolvedValue([]);
    await expect(service.listForUser('user-1')).resolves.toEqual([]);
  });
});
