import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('jwt-token') } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register (US03)', () => {
    it('crée le compte, hashe le mot de passe et renvoie un JWT', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'u1', email: data.email, passwordHash: data.passwordHash, createdAt: new Date('2026-01-01') }),
      );

      const res = await service.register({ email: 'a@b.fr', password: 'motdepasse123' });

      const saved = prisma.user.create.mock.calls[0][0].data;
      expect(saved.passwordHash).not.toContain('motdepasse123');
      expect(saved.passwordHash).toMatch(/^\$argon2/);
      expect(res.accessToken).toBe('jwt-token');
      expect(res.user).toEqual({ id: 'u1', email: 'a@b.fr', createdAt: '2026-01-01T00:00:00.000Z' });
    });

    it('rejette un email déjà utilisé (409)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(service.register({ email: 'a@b.fr', password: 'motdepasse123' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login (US04)', () => {
    it('renvoie un JWT pour des identifiants valides', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.fr',
        passwordHash: await hash('motdepasse123'),
        createdAt: new Date('2026-01-01'),
      });

      const res = await service.login({ email: 'a@b.fr', password: 'motdepasse123' });
      expect(res.accessToken).toBe('jwt-token');
      expect(res.user.email).toBe('a@b.fr');
    });

    it('rejette un mot de passe invalide (401)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.fr',
        passwordHash: await hash('motdepasse123'),
        createdAt: new Date(),
      });
      await expect(service.login({ email: 'a@b.fr', password: 'mauvais-mdp' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejette un email inconnu (401)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@y.fr', password: 'motdepasse123' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
