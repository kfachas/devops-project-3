import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, PayloadTooLargeException } from '@nestjs/common';
import type { Response } from 'express';

@Catch(PayloadTooLargeException)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'La taille des fichiers est limitée à 100 Mo',
      error: 'Payload Too Large',
    });
  }
}
