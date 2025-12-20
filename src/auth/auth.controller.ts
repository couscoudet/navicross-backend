import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SessionGuard } from './guards/session.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setSessionCookie(res, result.sessionId);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setSessionCookie(res, result.sessionId);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('cookie') cookie: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.extractSessionId(cookie);
    await this.authService.logout(sessionId);
    this.clearSessionCookie(res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  getMe(@CurrentUser() user: any) {
    return { user };
  }

  private setSessionCookie(res: Response, sessionId: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearSessionCookie(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('session_id', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
  }

  private extractSessionId(cookie: string): string | null {
    if (!cookie) return null;
    const match = cookie.match(/session_id=([^;]+)/);
    return match ? match[1] : null;
  }
}
