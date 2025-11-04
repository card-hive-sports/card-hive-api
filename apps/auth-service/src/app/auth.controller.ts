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
} from './dto';
import { AuthGuard } from './guards/auth.guard';
import { AuthorisedUser } from './decorators/authorised-user.decorator';
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
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.auth.register(registerDto, req);
  }

  @Post('login/phone/request')
  @ApiOperation({ summary: 'Request phone verification code' })
  async phoneLoginRequest(
    @Body() dto: PhoneLoginRequestDto,
    @Req() req: Request,
  ) {
    return this.auth.phoneLoginRequest(dto.phone, req);
  }

  @Post('login/phone/verify')
  async phoneLoginVerify(
    @Body() dto: PhoneLoginVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response, // Add this
  ) {
    const result = await this.auth.phoneLoginVerify(dto);
    const clientType = this.getClientType(req);

    const { refreshToken, ...options } = result;

    this.setRefreshTokenCookie(req, res, refreshToken, clientType);

    return options;
  }

  @Post('google')
  async googleLogin(
    @Body() body: GoogleIDTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response, // Add this
  ) {
    const result = await this.auth.googleLogin(body.idToken, req);
    const clientType = this.getClientType(req);

    const { refreshToken, ...options } = result;

    this.setRefreshTokenCookie(req, res, refreshToken, clientType);

    return options;
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientType = this.getClientType(req);

    const refreshToken = clientType === 'web'
      ? req.cookies?.refreshToken
      : dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const result = await this.auth.refresh(refreshToken);

    const { refreshToken: newRefreshToken, ...options } = result;

    this.setRefreshTokenCookie(req, res, newRefreshToken, clientType);

    return options;
  }

  @Post('logout')
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientType = this.getClientType(req);

    const refreshToken = clientType === 'web'
      ? req.cookies?.refreshToken
      : dto.refreshToken;

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

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict' as const,
        maxAge: Number(this.config.get('auth.jwt.refreshTokenExpiresIn', '7')),
        path: '/',
        ...(domain && { domain }),
      });
    }
  }

  private clearRefreshTokenCookie(req: Request, res: Response) {
    const domain = this.getBaseDomain(req);
    const isProduction = this.config.get('auth.node.environment') === 'production';

    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
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
    console.log("Host:", host);
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
