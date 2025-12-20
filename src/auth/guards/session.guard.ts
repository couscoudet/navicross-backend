import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const cookie = request.headers.cookie;

    if (!cookie) {
      throw new UnauthorizedException('Session invalide');
    }

    // Extraire session_id
    const sessionId = this.extractSessionId(cookie);
    if (!sessionId) {
      throw new UnauthorizedException('Session invalide');
    }

    // ✅ Utiliser validateSession existant
    const result = await this.authService.validateSession(sessionId);
    if (!result) {
      throw new UnauthorizedException('Session expirée');
    }

    // ✅ Injecter user ET session dans la requête
    request.user = result.user;
    request.session = result.session;
    return true;
  }

  private extractSessionId(cookie: string): string | null {
    const match = cookie.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
  }
}
