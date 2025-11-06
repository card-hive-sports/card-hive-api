import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpStatus,
  Req,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  PhoneLoginRequestDto,
  PhoneLoginVerifyDto,
  RefreshTokenDto,
  GoogleIDTokenDto,
  EmailLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { AuthGuard, AuthorisedUser } from '@card-hive/shared-auth';
import { ConfigService } from '@nestjs/config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  @ApiResponse({ status: HttpStatus.OK, description: 'Application is healthy' })
  async health() {
    return {
      status: HttpStatus.OK,
      description: 'Application is healthy',
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() body: RegisterDto, @Req() req: Request) {
    return this.auth.register(body, req);
  }

  @Post('login/phone/request')
  @ApiOperation({ summary: 'Request phone verification code' })
  async phoneLoginRequest(
    @Body() body: PhoneLoginRequestDto,
    @Req() req: Request,
  ) {
    return this.auth.phoneLoginRequest(body, req);
  }

  @Post('login/phone/verify')
  async phoneLoginVerify(
    @Body() body: PhoneLoginVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.phoneLoginVerify(body);
    const clientType = this.getClientType(req);

    const { refreshToken, ...options } = result;

    this.setRefreshTokenCookie(req, res, refreshToken, clientType);

    if (clientType !== 'web') {
      return { ...options, refreshToken };
    }

    return options;
  }

  @Post('login/email')
  @ApiOperation({ summary: 'Login with email and password' })
  async emailLogin(
    @Body() body: EmailLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.emailLogin(body, req);
    const clientType = this.getClientType(req);
    const { refreshToken, ...options } = result;
    this.setRefreshTokenCookie(req, res, refreshToken, clientType);

    if (clientType !== 'web') {
      return { ...options, refreshToken };
    }

    return options;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body);
  }

  @Post('google')
  async googleLogin(
    @Body() body: GoogleIDTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response, // Add this
  ) {
    const result = await this.auth.googleLogin(body, req);
    const clientType = this.getClientType(req);

    const { refreshToken, ...options } = result;

    this.setRefreshTokenCookie(req, res, refreshToken, clientType);

    if (clientType !== 'web') {
      return { ...options, refreshToken };
    }

    return options;
  }

  @Post('refresh')
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientType = this.getClientType(req);

    const refreshToken = clientType === 'web'
      ? req.cookies?.refreshToken
      : body.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const result = await this.auth.refresh(refreshToken);

    const { refreshToken: newRefreshToken, ...options } = result;

    this.setRefreshTokenCookie(req, res, newRefreshToken, clientType);

    if (clientType !== 'web') {
      return { ...options, refreshToken: newRefreshToken };
    }

    return options;
  }

  @Post('logout')
  async logout(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientType = this.getClientType(req);

    const refreshToken = clientType === 'web'
      ? req.cookies?.refreshToken
      : body.refreshToken;

    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }

    if (clientType === 'web') {
      this.clearRefreshTokenCookie(req, res);
    }

    return { message: 'Logged out successfully' };
  }

  @Post('logout/all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@AuthorisedUser('sub') userID: string) {
    return this.auth.logoutAll(userID);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@AuthorisedUser('sub') id: string) {
    return this.auth.getUserProfile(id);
  }

  private setRefreshTokenCookie(
    req: Request,
    res: Response,
    refreshToken: string,
    clientType: string,
  ) {
    if (clientType === 'web') {
      const isProduction = this.config.get('auth.node.environment') === 'production';
      const domain = this.getBaseDomain(req);
      const expiresInDays = Number(this.config.get('auth.refreshTokenExpiresIn', '7'));

      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? ('strict' as const) : ('lax' as const),
        maxAge: expiresInDays * 24 * 60 * 60 * 1000,
        path: '/',
        ...(domain && { domain }),
      };

      res.cookie('refreshToken', refreshToken, cookieOptions);
    }
  }

  private clearRefreshTokenCookie(req: Request, res: Response) {
    const domain = this.getBaseDomain(req);
    const isProduction = this.config.get('auth.node.environment') === 'production';

    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
      ...(domain && { domain }),
    };

    res.clearCookie('refreshToken', clearOptions);
  }

  private getClientType(req: Request): string {
    return (req.headers['x-client-type'] as string) || 'web';
  }

  private getBaseDomain(req: Request): string | undefined {
    const host = req.get('host');
    if (!host) return undefined;

    if (host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
      return undefined;
    }

    const parts = host.split('.');
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join('.')}`;
    }

    return undefined;
  }

  // TODO: Add Apple OAuth routes. Handle refresh tokens. Logout.
}
