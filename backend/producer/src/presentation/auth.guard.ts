import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IAccessTokenVerifier } from '../application/ports/IAccessTokenVerifier';
import { ACCESS_TOKEN_VERIFIER_TOKEN } from '../domain/ports/tokens';


@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_VERIFIER_TOKEN)
    private readonly tokenVerifier: IAccessTokenVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const rawAuthorization = request.headers.authorization;

    if (!rawAuthorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = rawAuthorization.replace('Bearer ', '').trim();
    const payload = this.tokenVerifier.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    request['authUser'] = payload;
    return true;
  }
}