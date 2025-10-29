import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, PhoneLoginRequestDto, PhoneLoginVerifyDto } from './dto';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.fullName,
      registerDto.email,
      registerDto.phone,
      registerDto.dateOfBirth,
    );
  }

  @Post('login/phone/request')
  @ApiOperation({ summary: 'Request phone verification code' })
  async phoneLoginRequest(@Body() dto: PhoneLoginRequestDto) {
    return this.authService.phoneLoginRequest(dto.phone);
  }

  @Post('login/phone/verify')
  @ApiOperation({ summary: 'Verify phone code and login' })
  async phoneLoginVerify(@Body() dto: PhoneLoginVerifyDto) {
    return this.authService.phoneLoginVerify(dto.phone, dto.code);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: Request) {
    return req.user;
  }

  // TODO: Add Google & Apple OAuth routes. Handle refresh tokens. Logout.
}
