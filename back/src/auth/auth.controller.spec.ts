import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const auth = { register: jest.fn(), login: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compile();
    controller = moduleRef.get(AuthController);
  });

  it('register délègue au service', async () => {
    const dto = { email: 'a@b.fr', password: 'motdepasse123' };
    auth.register.mockResolvedValue({ accessToken: 't' });
    await expect(controller.register(dto)).resolves.toEqual({ accessToken: 't' });
    expect(auth.register).toHaveBeenCalledWith(dto);
  });

  it('login délègue au service', async () => {
    const dto = { email: 'a@b.fr', password: 'motdepasse123' };
    auth.login.mockResolvedValue({ accessToken: 't' });
    await expect(controller.login(dto)).resolves.toEqual({ accessToken: 't' });
    expect(auth.login).toHaveBeenCalledWith(dto);
  });
});
