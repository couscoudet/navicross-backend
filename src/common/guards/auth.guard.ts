import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = this.extractSessionId(request.headers.cookie);

    if (!sessionId) {
      throw new UnauthorizedException('No session provided');
    }

    const result = await this.authService.validateSession(sessionId);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request.user = result.user;
    return true;
  }

  private extractSessionId(cookie: string): string | null {
    if (!cookie) return null;
    const match = cookie.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
  }
}
