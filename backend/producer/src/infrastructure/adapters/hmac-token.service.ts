import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITokenService } from '../../application/use-cases/login.use-case';
import { IAccessTokenVerifier } from '../../application/ports/IAccessTokenVerifier';


@Injectable()
export class HmacTokenService implements ITokenService, IAccessTokenVerifier {
  constructor(private readonly configService: ConfigService) {}

  generateToken(payload: Record<string, unknown>): string {
    const data = this.encode(payload);
    const signature = this.sign(data);
    return `${data}.${signature}`;
  }

  verifyToken(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [data, signature] = parts;
    const expected = this.sign(data);

    if (!this.safeEqual(signature, expected)) {
      return null;
    }

    try {
      const decoded = Buffer.from(data, 'base64url').toString('utf8');
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private encode(payload: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private sign(data: string): string {
    const secret = this.configService.get<string>('AUTH_TOKEN_SECRET', 'dev-auth-secret');
    return createHmac('sha256', secret).update(data).digest('base64url');
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}