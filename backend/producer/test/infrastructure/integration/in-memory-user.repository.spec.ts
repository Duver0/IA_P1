import { InMemoryUserRepository } from '../../../src/infrastructure/adapters/in-memory-user.repository';

describe('InMemoryUserRepository (Infrastructure)', () => {
    let repository: InMemoryUserRepository;

    beforeEach(() => {
        repository = new InMemoryUserRepository();
    });

    describe('findByEmail', () => {
        it('retorna null si el usuario no existe', async () => {
            // Arrange
            const email = 'nonexistent@test.com';

            // Act
            const result = await repository.findByEmail(email);

            // Assert
            expect(result).toBeNull();
        });

        it('retorna el usuario si existe', async () => {
            // Arrange
            const userData = {
                email: 'test@test.com',
                passwordHash: 'hash123',
                nombre: 'Test User',
                rol: 'employee',
            };
            await repository.create(userData);

            // Act
            const result = await repository.findByEmail(userData.email);

            // Assert
            expect(result).not.toBeNull();
            expect(result?.email).toBe(userData.email);
            expect(result?.nombre).toBe(userData.nombre);
        });
    });

    describe('create', () => {
        it('crea un usuario con ID secuencial', async () => {
            // Arrange
            const userData = {
                email: 'new@test.com',
                passwordHash: 'hash',
                nombre: 'New User',
                rol: 'admin',
            };

            // Act
            const user = await repository.create(userData);

            // Assert
            expect(user.id).toBeDefined();
            expect(user.email).toBe(userData.email);
            expect(user.isActive).toBe(true);
        });

        it('asigna IDs únicos a usuarios consecutivos', async () => {
            // Arrange
            const userData1 = { email: 'user1@test.com', passwordHash: 'h1', nombre: 'U1', rol: 'r' };
            const userData2 = { email: 'user2@test.com', passwordHash: 'h2', nombre: 'U2', rol: 'r' };

            // Act
            const user1 = await repository.create(userData1);
            const user2 = await repository.create(userData2);

            // Assert
            expect(user1.id).not.toBe(user2.id);
        });
    });
});
