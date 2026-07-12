export const MAX_FILE_SIZE_BYTES = 104_857_600;

export const MIN_EXPIRY_DAYS = 1;
export const MAX_EXPIRY_DAYS = 7;
export const DEFAULT_EXPIRY_DAYS = 7;

export const USER_PASSWORD_MIN_LENGTH = 8;
export const FILE_PASSWORD_MIN_LENGTH = 6;

export const TAG_MAX_LENGTH = 30;

export const FORBIDDEN_FILE_EXTENSIONS = [
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'msi',
  'sh',
  'app',
  'dmg',
  'pkg',
  'deb',
  'rpm',
  'appimage',
  'apk',
  'msix',
] as const;
