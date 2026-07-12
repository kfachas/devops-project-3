import { Module } from '@nestjs/common';
import { StagingCleanupService } from './staging-cleanup.service';
import { TasksService } from './tasks.service';

@Module({
  providers: [TasksService, StagingCleanupService],
})
export class TasksModule {}
