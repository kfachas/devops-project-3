import type { ArgumentsHost } from '@nestjs/common';
import { PayloadTooLargeException } from '@nestjs/common';
import { MulterExceptionFilter } from './multer-exception.filter';

describe('MulterExceptionFilter', () => {
  it('renvoie un 413 JSON en français', () => {
    const filter = new MulterExceptionFilter();
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    filter.catch(new PayloadTooLargeException('File too large'), host);

    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith({
      statusCode: 413,
      message: 'La taille des fichiers est limitée à 100 Mo',
      error: 'Payload Too Large',
    });
  });
});
