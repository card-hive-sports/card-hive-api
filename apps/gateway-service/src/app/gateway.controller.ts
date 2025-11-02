import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('')
@ApiTags('Gateway')
export class GatewayController {
  @Get('health')
  @ApiResponse({ status: HttpStatus.OK, description: 'Application is healthy' })
  async health() {
    return {
      status: HttpStatus.OK,
      description: 'Application is healthy',
    };
  }
}
