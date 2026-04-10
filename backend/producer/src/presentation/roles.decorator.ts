import { SetMetadata } from '@nestjs/common';

export const AUTH_ROLES_KEY = 'auth:roles';
export const Roles = (...roles: string[]) => SetMetadata(AUTH_ROLES_KEY, roles);