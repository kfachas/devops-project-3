import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron(process.env.PURGE_CRON ?? CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpired(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.file.findMany({ where: { expiresAt: { lte: now } } });
    for (const file of expired) {
      await this.storage.remove(file.storedPath);
    }
    const { count } = await this.prisma.file.deleteMany({ where: { expiresAt: { lte: now } } });
    if (count > 0) {
      this.logger.log(`Purge : ${count} fichier(s) expiré(s) supprimé(s)`);
    }
    return count;
  }
}
