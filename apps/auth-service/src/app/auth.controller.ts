import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, PhoneLoginRequestDto, PhoneLoginVerifyDto } from './dto';
import { AuthGuard } from './guards/auth.guard';
import { AuthorisedUser } from './decorators/authorised-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('health')
  @ApiResponse({ status: HttpStatus.OK, description: 'Application is healthy' })
  async health() {
    return { status: 'healthy' };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: RegisterDto) {
    return this.auth.register(
      registerDto.fullName,
      registerDto.email,
      registerDto.phone,
      registerDto.dateOfBirth,
    );
  }

  @Post('login/phone/request')
  @ApiOperation({ summary: 'Request phone verification code' })
  async phoneLoginRequest(@Body() dto: PhoneLoginRequestDto) {
    return this.auth.phoneLoginRequest(dto.phone);
  }

  @Post('login/phone/verify')
  @ApiOperation({ summary: 'Verify phone code and login' })
  async phoneLoginVerify(@Body() dto: PhoneLoginVerifyDto) {
    return this.auth.phoneLoginVerify(dto.phone, dto.code);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@AuthorisedUser('sub') id: string) {
    return this.auth.getUserProfile(id);
  }

  // TODO: Add Google & Apple OAuth routes. Handle refresh tokens. Logout.
}
