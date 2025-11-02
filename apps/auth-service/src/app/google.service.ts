import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleService {
  private client: OAuth2Client;

  constructor(private readonly config: ConfigService) {
    this.client = new OAuth2Client(
      this.config.get('auth.google.clientID'),
      this.config.get('auth.google.clientSecret')
    );
  }

  async verifyToken(token: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.config.get('auth.google.clientID'),
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        providerID: payload.sub,
        email: payload.email as string,
        fullName: payload.name || 'Google User',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
