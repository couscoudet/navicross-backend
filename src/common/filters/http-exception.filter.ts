// backend/src/common/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponseDto;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorResponse = new ErrorResponseDto(
          exceptionResponse,
          `HTTP_${status}`,
          status,
        );
      } else if (typeof exceptionResponse === 'object') {
        const message = (exceptionResponse as any).message || exception.message;
        const code = (exceptionResponse as any).code || `HTTP_${status}`;
        errorResponse = new ErrorResponseDto(message, code, status);
      } else {
        errorResponse = new ErrorResponseDto(
          exception.message,
          `HTTP_${status}`,
          status,
        );
      }
    } else if (exception instanceof Error) {
      // Erreurs non-HTTP (ex: timeout, network)
      if (exception.name === 'AbortError') {
        errorResponse = ErrorResponseDto.fromTimeoutError();
        status = 408;
      } else {
        errorResponse = new ErrorResponseDto(
          exception.message || 'Erreur interne du serveur',
          'INTERNAL_ERROR',
          500,
        );
      }
    } else {
      errorResponse = new ErrorResponseDto(
        'Une erreur inconnue est survenue',
        'UNKNOWN_ERROR',
        500,
      );
    }

    // Ajouter le path de la requête
    errorResponse.path = request.url;

    // Logger l'erreur (à adapter selon votre logger)
    console.error('Error caught by filter:', {
      path: request.url,
      method: request.method,
      status,
      error: exception,
    });

    response.status(status).json(errorResponse);
  }
}
