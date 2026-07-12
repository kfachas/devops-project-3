import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      useFactory: (config: ConfigService): StorageService =>
        config.get<string>('STORAGE_DRIVER') === 's3'
          ? new S3StorageService(config)
          : new LocalStorageService(config),
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
