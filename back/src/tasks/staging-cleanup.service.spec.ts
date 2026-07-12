import { readdir, stat, unlink } from 'node:fs/promises';
import { StagingCleanupService } from './staging-cleanup.service';

jest.mock('node:fs/promises');

describe('StagingCleanupService', () => {
  const service = new StagingCleanupService();

  beforeEach(() => {
    jest.clearAllMocks();
    (unlink as jest.Mock).mockResolvedValue(undefined);
  });

  it('supprime uniquement les fichiers de plus d’une heure', async () => {
    const now = Date.now();
    (readdir as jest.Mock).mockResolvedValue(['old.tmp', 'fresh.tmp']);
    (stat as jest.Mock).mockImplementation((path: string) =>
      Promise.resolve({ mtimeMs: path.includes('old') ? now - 2 * 60 * 60 * 1000 : now - 60_000 }),
    );

    const removed = await service.sweepOrphans();

    expect(removed).toBe(1);
    expect(unlink).toHaveBeenCalledTimes(1);
    expect((unlink as jest.Mock).mock.calls[0][0]).toContain('old.tmp');
  });

  it('tolère un dossier de staging absent', async () => {
    (readdir as jest.Mock).mockRejectedValue(new Error('ENOENT'));
    await expect(service.sweepOrphans()).resolves.toBe(0);
    expect(unlink).not.toHaveBeenCalled();
  });
});
