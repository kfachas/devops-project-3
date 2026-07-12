import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { MAX_FILE_SIZE_BYTES } from '@datashare/shared';

const stagingRoot = join(process.env.STORAGE_PATH ?? './storage', '.staging');

export const multerOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      if (!existsSync(stagingRoot)) {
        mkdirSync(stagingRoot, { recursive: true });
      }
      cb(null, stagingRoot);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
};
