import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TagSummaryDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<TagSummaryDto[]> {
    const links = await this.prisma.fileTag.findMany({
      where: { file: { ownerId: userId } },
      include: { tag: true },
    });
    const counts = new Map<string, number>();
    for (const link of links) {
      counts.set(link.tag.label, (counts.get(link.tag.label) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count }));
  }
}
