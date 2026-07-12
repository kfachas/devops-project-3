import { OptionalJwtAuthGuard } from './guards';

describe('OptionalJwtAuthGuard (US07)', () => {
  const guard = new OptionalJwtAuthGuard();

  it('laisse passer un utilisateur authentifié', () => {
    const user = { userId: 'u1', email: 'a@b.fr' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('laisse passer sans utilisateur (anonyme) au lieu de rejeter', () => {
    expect(guard.handleRequest(null, false)).toBe(false);
    expect(() => guard.handleRequest(new Error('no token'), false)).not.toThrow();
  });
});
