import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AppModule } from '../src/app.module';

async function exportSpec(): Promise<void> {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('DataShare API')
    .setDescription('API de transfert de fichiers DataShare (US01-US10)')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const out = join(process.cwd(), '..', 'docs', 'openapi.json');
  if (!existsSync(dirname(out))) {
    mkdirSync(dirname(out), { recursive: true });
  }
  writeFileSync(out, JSON.stringify(document, null, 2));
  await app.close();
  console.log(`OpenAPI exporté → ${out}`);
}

void exportSpec();
