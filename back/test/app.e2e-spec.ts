import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { TasksService } from '../src/tasks/tasks.service';

describe('DataShare API (e2e, US01-US10)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const owner = { email: 'owner@datashare.app', password: 'motdepasse123' };
  const intruder = { email: 'intruder@datashare.app', password: 'motdepasse123' };
  let ownerToken: string;
  let intruderToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    http = app.getHttpServer();

    await prisma.file.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth (US03/US04)', () => {
    it('register crée un compte et renvoie un JWT', async () => {
      const res = await request(http).post('/api/auth/register').send(owner).expect(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(owner.email);
      ownerToken = res.body.accessToken;

      intruderToken = (await request(http).post('/api/auth/register').send(intruder).expect(201))
        .body.accessToken;
    });

    it('rejette un email déjà utilisé (409)', () =>
      request(http).post('/api/auth/register').send(owner).expect(409));

    it('rejette un mot de passe trop court (400, validation serveur)', () =>
      request(http)
        .post('/api/auth/register')
        .send({ email: 'court@datashare.app', password: 'court' })
        .expect(400));

    it('rejette un champ inconnu (400, whitelist)', () =>
      request(http)
        .post('/api/auth/register')
        .send({ email: 'x@y.fr', password: 'motdepasse123', admin: true })
        .expect(400));

    it('login renvoie un JWT et rejette un mauvais mot de passe (401)', async () => {
      await request(http).post('/api/auth/login').send(owner).expect(200);
      await request(http)
        .post('/api/auth/login')
        .send({ email: owner.email, password: 'mauvais-mdp' })
        .expect(401);
    });
  });

  describe('Upload (US01/US07/US09)', () => {
    let protectedToken: string;
    let ownedFileId: string;

    it('upload connecté avec tags, mot de passe et expiration (US01)', async () => {
      const res = await request(http)
        .post('/api/files')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('contenu proprio'), 'rapport.pdf')
        .field('expiresInDays', '3')
        .field('password', 'secret123')
        .field('tags', 'travail,2026')
        .expect(201);

      expect(res.body.downloadToken).toBeDefined();
      expect(res.body.passwordProtected).toBe(true);
      expect(res.body.tags).toEqual(['travail', '2026']);
      protectedToken = res.body.downloadToken;
    });

    it('upload anonyme sans compte (US07)', async () => {
      const res = await request(http)
        .post('/api/files')
        .attach('file', Buffer.from('contenu anonyme'), 'anonyme.txt')
        .expect(201);
      expect(res.body.passwordProtected).toBe(false);
    });

    it('rejette une extension interdite (.exe)', () =>
      request(http)
        .post('/api/files')
        .attach('file', Buffer.from('MZ'), 'virus.exe')
        .expect(403));

    it('rejette une expiration > 7 jours (400, validation serveur)', () =>
      request(http)
        .post('/api/files')
        .attach('file', Buffer.from('x'), 'doc.txt')
        .field('expiresInDays', '10')
        .expect(400));

    it("l'historique ne montre que les fichiers du propriétaire (US05)", async () => {
      const res = await request(http)
        .get('/api/files')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].originalName).toBe('rapport.pdf');
      expect(res.body[0].status).toBe('active');
      ownedFileId = res.body[0].id;

      const intruderList = await request(http)
        .get('/api/files')
        .set('Authorization', `Bearer ${intruderToken}`)
        .expect(200);
      expect(intruderList.body).toHaveLength(0);
    });

    it("l'historique sans JWT est refusé (401)", () => request(http).get('/api/files').expect(401));

    it('filtre l’historique par tag (US08)', async () => {
      const res = await request(http)
        .get('/api/files?tag=travail')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(res.body).toHaveLength(1);

      const none = await request(http)
        .get('/api/files?tag=inexistant')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(none.body).toHaveLength(0);
    });

    it('liste les tags de l’utilisateur (US08)', async () => {
      const res = await request(http)
        .get('/api/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          { label: 'travail', count: 1 },
          { label: '2026', count: 1 },
        ]),
      );
    });

    describe('Téléchargement via lien (US02/US09)', () => {
      it('expose les métadonnées avant téléchargement', async () => {
        const res = await request(http).get(`/api/files/${protectedToken}`).expect(200);
        expect(res.body).toMatchObject({
          originalName: 'rapport.pdf',
          passwordProtected: true,
        });
      });

      it('lien inconnu → 404 explicite', () => request(http).get('/api/files/token-inconnu').expect(404));

      it('vérifie le mot de passe (US09)', async () => {
        const ok = await request(http)
          .post(`/api/files/${protectedToken}/verify`)
          .send({ password: 'secret123' })
          .expect(201);
        expect(ok.body.valid).toBe(true);

        const ko = await request(http)
          .post(`/api/files/${protectedToken}/verify`)
          .send({ password: 'mauvais' })
          .expect(201);
        expect(ko.body.valid).toBe(false);
      });

      it('refuse le téléchargement protégé sans mot de passe (403) et le sert avec (200)', async () => {
        await request(http).get(`/api/files/${protectedToken}/download`).expect(403);

        const res = await request(http)
          .get(`/api/files/${protectedToken}/download`)
          .set('x-file-password', 'secret123')
          .expect(200);
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.body.toString()).toBe('contenu proprio');
      });
    });

    describe('Suppression (US06)', () => {
      it("refuse la suppression par un autre utilisateur (404)", () =>
        request(http)
          .delete(`/api/files/${ownedFileId}`)
          .set('Authorization', `Bearer ${intruderToken}`)
          .expect(404));

      it('supprime définitivement pour le propriétaire', async () => {
        await request(http)
          .delete(`/api/files/${ownedFileId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        await request(http).get(`/api/files/${protectedToken}`).expect(404);
      });
    });
  });

  describe('Expiration & purge (US10)', () => {
    it('un lien expiré renvoie 410 Gone, puis la purge le supprime', async () => {
      const expired = await prisma.file.create({
        data: {
          originalName: 'vieux.txt',
          storedPath: '/tmp/inexistant-vieux.txt',
          mimeType: 'text/plain',
          sizeBytes: BigInt(1),
          downloadToken: 'token-expire-e2e',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await request(http).get('/api/files/token-expire-e2e').expect(410);

      const purged = await app.get(TasksService).purgeExpired();
      expect(purged).toBeGreaterThanOrEqual(1);
      expect(await prisma.file.findUnique({ where: { id: expired.id } })).toBeNull();
    });
  });

  describe('Rate-limiting (sécurité)', () => {
    it('finit par renvoyer 429 sur le login en cas d’abus', async () => {
      let throttled = false;
      for (let i = 0; i < 15 && !throttled; i++) {
        const res = await request(http)
          .post('/api/auth/login')
          .send({ email: owner.email, password: 'mauvais-mdp' });
        throttled = res.status === 429;
      }
      expect(throttled).toBe(true);
    });
  });
});
