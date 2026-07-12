import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('mappe le payload JWT vers l’utilisateur courant', () => {
    const strategy = new JwtStrategy({ get: () => 'secret' } as unknown as ConfigService);
    expect(strategy.validate({ sub: 'u1', email: 'a@b.fr' })).toEqual({
      userId: 'u1',
      email: 'a@b.fr',
    });
  });
});
