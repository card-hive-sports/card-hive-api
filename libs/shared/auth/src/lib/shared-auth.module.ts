import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RolesGuard, AuthGuard, SelfOrRolesGuard } from './guards/index.js';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get('JWT_SECRET'),
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
        }
      }
    }),
  ],
  providers: [AuthGuard, RolesGuard, SelfOrRolesGuard],
  exports: [JwtModule, AuthGuard, RolesGuard, SelfOrRolesGuard],
})
export class SharedAuthModule {}
