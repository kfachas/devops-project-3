import { Test } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  it('liste les tags de l’utilisateur courant', async () => {
    const tags = { listForUser: jest.fn().mockResolvedValue([{ label: 'perso', count: 1 }]) };
    const moduleRef = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [{ provide: TagsService, useValue: tags }],
    }).compile();

    const controller = moduleRef.get(TagsController);
    await expect(controller.list({ userId: 'u1', email: 'a@b.fr' })).resolves.toEqual([
      { label: 'perso', count: 1 },
    ]);
    expect(tags.listForUser).toHaveBeenCalledWith('u1');
  });
});
