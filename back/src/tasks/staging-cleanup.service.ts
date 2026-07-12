import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const STAGING_MAX_AGE_MS = 60 * 60 * 1000;

@Injectable()
export class StagingCleanupService {
  private readonly logger = new Logger(StagingCleanupService.name);
  private readonly stagingRoot = join(process.env.STORAGE_PATH ?? './storage', '.staging');

  @Cron(process.env.STAGING_SWEEP_CRON ?? CronExpression.EVERY_HOUR)
  async sweepOrphans(): Promise<number> {
    const entries = await readdir(this.stagingRoot).catch(() => [] as string[]);
    const now = Date.now();
    let removed = 0;
    for (const entry of entries) {
      const path = join(this.stagingRoot, entry);
      const stats = await stat(path).catch(() => null);
      if (stats && now - stats.mtimeMs > STAGING_MAX_AGE_MS) {
        await unlink(path).catch(() => undefined);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Nettoyage staging : ${removed} fichier(s) orphelin(s) supprimé(s)`);
    }
    return removed;
  }
}
