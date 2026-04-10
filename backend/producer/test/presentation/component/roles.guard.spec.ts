import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/presentation/roles.guard';

describe('RolesGuard (Presentation)', () => {
  let reflector: {
    getAllAndOverride: jest.Mock;
    get: jest.Mock;
    getAll: jest.Mock;
    getAllAndMerge: jest.Mock;
  };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows request when no roles metadata is defined', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const request = { authUser: { rol: 'medico' } };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('throws when user role is missing for protected endpoint', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue(['admin', 'medico']);
    const request = { authUser: undefined };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    // Act
    const act = () => guard.canActivate(context);

    // Assert
    expect(act).toThrow(ForbiddenException);
  });

  it('throws when user role is not allowed', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const request = { authUser: { rol: 'empleado' } };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    // Act
    const act = () => guard.canActivate(context);

    // Assert
    expect(act).toThrow(ForbiddenException);
  });

  it('allows request when user role is allowed', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue(['admin', 'medico']);
    const request = { authUser: { rol: 'medico' } };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });
});