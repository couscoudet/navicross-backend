// backend/src/common/dto/error-response.dto.ts

export class ErrorResponseDto {
  error: boolean;
  message: string;
  code?: string;
  timestamp: string;
  path?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    this.error = true;
    this.message = message;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.statusCode = statusCode;
  }

  static fromValhallaError(valhallaError: any): ErrorResponseDto {
    // Mapping des codes d'erreur Valhalla vers messages français
    const errorMap: Record<number, { message: string; code: string }> = {
      442: {
        message:
          'Aucun itinéraire trouvé. Les zones à éviter bloquent tous les chemins possibles.',
        code: 'ROUTE_NOT_FOUND',
      },
      171: {
        message:
          'Zone à éviter trop grande. Veuillez réduire la taille des fermetures.',
        code: 'AVOID_AREA_TOO_LARGE',
      },
      400: {
        message: 'Requête invalide. Vérifiez les coordonnées fournies.',
        code: 'INVALID_REQUEST',
      },
      500: {
        message: 'Erreur interne du serveur de routage.',
        code: 'ROUTING_SERVER_ERROR',
      },
    };

    const errorCode = valhallaError.error_code || valhallaError.status_code;
    const mapped = errorMap[errorCode];

    if (mapped) {
      return new ErrorResponseDto(mapped.message, mapped.code, errorCode);
    }

    // Fallback : utiliser le message d'erreur Valhalla
    const message =
      valhallaError.error ||
      valhallaError.message ||
      "Impossible de calculer l'itinéraire";

    return new ErrorResponseDto(message, 'ROUTING_ERROR', errorCode);
  }

  static fromRateLimitError(): ErrorResponseDto {
    return new ErrorResponseDto(
      'Trop de requêtes en cours. Veuillez patienter quelques secondes et réessayer.',
      'RATE_LIMIT_EXCEEDED',
      429,
    );
  }

  static fromTimeoutError(): ErrorResponseDto {
    return new ErrorResponseDto(
      'La requête a pris trop de temps. Vérifiez votre connexion et réessayez.',
      'REQUEST_TIMEOUT',
      408,
    );
  }

  static fromNetworkError(): ErrorResponseDto {
    return new ErrorResponseDto(
      'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
      'NETWORK_ERROR',
      503,
    );
  }
}
