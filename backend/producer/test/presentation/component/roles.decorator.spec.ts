import 'reflect-metadata';
import { AUTH_ROLES_KEY, Roles } from '../../../src/presentation/roles.decorator';

describe('Roles decorator (Presentation)', () => {
  it('stores required roles as endpoint metadata', () => {
    class DummyController {
      @Roles('admin', 'medico')
      handler(): void {}
    }

    const metadata = Reflect.getMetadata(AUTH_ROLES_KEY, DummyController.prototype.handler);
    expect(metadata).toEqual(['admin', 'medico']);
  });
});