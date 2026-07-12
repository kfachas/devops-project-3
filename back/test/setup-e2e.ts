import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.JWT_SECRET ??= 'e2e-test-secret';
process.env.JWT_EXPIRES_IN ??= '1h';
process.env.FRONT_URL ??= 'http://localhost:4200';
process.env.STORAGE_PATH ??= mkdtempSync(join(tmpdir(), 'ds-e2e-storage-'));
