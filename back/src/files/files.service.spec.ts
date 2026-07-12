import { BadRequestException, ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FilesService } from './files.service';

describe('FilesService', () => {
  let service: FilesService;

  const prisma = {
    file: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
  const storage = {
    save: jest.fn().mockResolvedValue(undefined),
    read: jest.fn(),
    exists: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const uploadedFile = (over: Partial<Record<string, unknown>> = {}) => ({
    originalname: 'rapport.pdf',
    mimetype: 'application/pdf',
    size: 1234,
    path: '/data/storage/.staging/uuid.pdf',
    filename: 'uuid.pdf',
    ...over,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:4200') },
        },
      ],
    }).compile();
    service = moduleRef.get(FilesService);
  });

  describe('upload (US01/US07/US09)', () => {
    it('rejette une requête sans fichier (400)', async () => {
      await expect(service.upload(undefined as never, {})).rejects.toThrow(BadRequestException);
    });

    it('rejette une extension interdite et nettoie le disque (403)', async () => {
      const file = uploadedFile({ originalname: 'virus.exe', path: '/tmp/x.exe' });
      await expect(service.upload(file as never, {})).rejects.toThrow(ForbiddenException);
      expect(storage.save).not.toHaveBeenCalled();
      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it('crée le fichier avec token non-prédictible, expiration demandée, mot de passe hashé et tags dédupliqués', async () => {
      prisma.file.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...data, sizeBytes: BigInt(data.sizeBytes), expiresAt: data.expiresAt }),
      );

      const before = Date.now();
      const res = await service.upload(
        uploadedFile() as never,
        { expiresInDays: 3, password: 'secret123', tags: 'demo, demo , perso' },
        'user-1',
      );
      const after = Date.now();

      const data = prisma.file.create.mock.calls[0][0].data;
      expect(data.ownerId).toBe('user-1');
      expect(data.downloadToken).toHaveLength(32);
      expect(data.passwordHash).toMatch(/^\$argon2/);
      expect(data.tags.create.map((t: { tag: { connectOrCreate: { create: { label: string } } } }) => t.tag.connectOrCreate.create.label)).toEqual(['demo', 'perso']);
      const expiresMs = new Date(data.expiresAt).getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 3 * 86_400_000);
      expect(expiresMs).toBeLessThanOrEqual(after + 3 * 86_400_000);
      expect(res.downloadUrl).toBe(`http://localhost:4200/d/${data.downloadToken}`);
      expect(res.passwordProtected).toBe(true);
      expect(res.tags).toEqual(['demo', 'perso']);
    });

    it('rejette un tag trop long (400) sans rien stocker (US08)', async () => {
      const longTag = 'x'.repeat(31);
      await expect(
        service.upload(uploadedFile() as never, { tags: longTag }),
      ).rejects.toThrow(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it('nettoie le fichier stocké si la création en base échoue (anti-orphelin)', async () => {
      prisma.file.create.mockRejectedValue(new Error('db down'));
      await expect(service.upload(uploadedFile() as never, {})).rejects.toThrow('db down');
      expect(storage.save).toHaveBeenCalled();
      expect(storage.remove).toHaveBeenCalledWith('uuid.pdf');
    });

    it('applique les défauts : anonyme (US07), 7 jours, sans mot de passe ni tags', async () => {
      prisma.file.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...data, sizeBytes: BigInt(data.sizeBytes) }),
      );

      const res = await service.upload(uploadedFile() as never, {});

      const data = prisma.file.create.mock.calls[0][0].data;
      expect(data.ownerId).toBeNull();
      expect(data.passwordHash).toBeNull();
      expect(data.tags.create).toEqual([]);
      const days = (new Date(data.expiresAt).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.9);
      expect(res.passwordProtected).toBe(false);
    });
  });

  describe('history (US05/US08)', () => {
    it("liste les fichiers de l'utilisateur avec statut et tags", async () => {
      prisma.file.findMany.mockResolvedValue([
        {
          id: 'f1',
          originalName: 'a.txt',
          sizeBytes: BigInt(10),
          mimeType: 'text/plain',
          downloadToken: 'tok',
          expiresAt: new Date(Date.now() + 86_400_000),
          createdAt: new Date(),
          passwordHash: null,
          tags: [{ tag: { label: 'perso' } }],
        },
        {
          id: 'f2',
          originalName: 'b.txt',
          sizeBytes: BigInt(20),
          mimeType: 'text/plain',
          downloadToken: 'tok2',
          expiresAt: new Date(Date.now() - 1000),
          createdAt: new Date(),
          passwordHash: 'hash',
          tags: [],
        },
      ]);

      const res = await service.history('user-1');

      expect(prisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 'user-1' } }),
      );
      expect(res[0]).toMatchObject({ id: 'f1', status: 'active', tags: ['perso'], passwordProtected: false });
      expect(res[1]).toMatchObject({ id: 'f2', status: 'expired', passwordProtected: true });
    });

    it('filtre par tag quand demandé (US08)', async () => {
      prisma.file.findMany.mockResolvedValue([]);
      await service.history('user-1', 'perso');
      expect(prisma.file.findMany.mock.calls[0][0].where.tags).toEqual({
        some: { tag: { label: 'perso' } },
      });
    });
  });

  describe('metadata / findValid (US02)', () => {
    it('renvoie les métadonnées d’un lien valide', async () => {
      prisma.file.findUnique.mockResolvedValue({
        originalName: 'a.txt',
        sizeBytes: BigInt(10),
        mimeType: 'text/plain',
        expiresAt: new Date(Date.now() + 1000),
        passwordHash: null,
      });
      const res = await service.metadata('tok');
      expect(res).toMatchObject({ originalName: 'a.txt', passwordProtected: false });
    });

    it('lien inconnu → 404', async () => {
      prisma.file.findUnique.mockResolvedValue(null);
      await expect(service.metadata('nope')).rejects.toThrow(NotFoundException);
    });

    it('lien expiré → 410 Gone', async () => {
      prisma.file.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.metadata('tok')).rejects.toThrow(GoneException);
    });
  });

  describe('verifyPassword (US09)', () => {
    it('renvoie true si le fichier n’est pas protégé', async () => {
      prisma.file.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 1000),
        passwordHash: null,
      });
      await expect(service.verifyPassword('tok', 'peu-importe')).resolves.toBe(true);
    });

    it('vérifie le hash argon2 (bon et mauvais mot de passe)', async () => {
      prisma.file.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 1000),
        passwordHash: await hash('secret123'),
      });
      await expect(service.verifyPassword('tok', 'secret123')).resolves.toBe(true);
      await expect(service.verifyPassword('tok', 'mauvais')).resolves.toBe(false);
    });
  });

  describe('resolveForDownload (US02/US09)', () => {
    const base = {
      storedPath: '/data/x',
      expiresAt: new Date(Date.now() + 1000),
    };

    it('exige le mot de passe d’un fichier protégé (403)', async () => {
      prisma.file.findUnique.mockResolvedValue({ ...base, passwordHash: await hash('secret123') });
      await expect(service.resolveForDownload('tok')).rejects.toThrow(ForbiddenException);
      await expect(service.resolveForDownload('tok', 'mauvais')).rejects.toThrow(ForbiddenException);
    });

    it('renvoie le fichier si le mot de passe est correct et le binaire présent', async () => {
      prisma.file.findUnique.mockResolvedValue({ ...base, passwordHash: await hash('secret123') });
      storage.exists.mockResolvedValue(true);
      await expect(service.resolveForDownload('tok', 'secret123')).resolves.toMatchObject(base);
    });

    it('binaire absent du disque → 404', async () => {
      prisma.file.findUnique.mockResolvedValue({ ...base, passwordHash: null });
      storage.exists.mockResolvedValue(false);
      await expect(service.resolveForDownload('tok')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (US06)', () => {
    it('supprime disque + métadonnées pour le propriétaire', async () => {
      prisma.file.findUnique.mockResolvedValue({ id: 'f1', ownerId: 'user-1', storedPath: '/data/x' });
      await service.remove('f1', 'user-1');
      expect(storage.remove).toHaveBeenCalledWith('/data/x');
      expect(prisma.file.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
    });

    it('refuse la suppression d’un fichier d’un autre utilisateur (404)', async () => {
      prisma.file.findUnique.mockResolvedValue({ id: 'f1', ownerId: 'autre', storedPath: '/data/x' });
      await expect(service.remove('f1', 'user-1')).rejects.toThrow(NotFoundException);
      expect(storage.remove).not.toHaveBeenCalled();
    });
  });

  it('streamFor délègue au StorageService', async () => {
    const fakeStream = {};
    storage.read.mockResolvedValue(fakeStream);
    await expect(service.streamFor('/data/x')).resolves.toBe(fakeStream);
  });
});
