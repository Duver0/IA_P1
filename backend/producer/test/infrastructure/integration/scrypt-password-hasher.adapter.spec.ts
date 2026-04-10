import { ScryptPasswordHasherAdapter } from '../../../src/infrastructure/adapters/scrypt-password-hasher.adapter';

describe('ScryptPasswordHasherAdapter (Infrastructure)', () => {
    let hasher: ScryptPasswordHasherAdapter;

    beforeEach(() => {
        hasher = new ScryptPasswordHasherAdapter();
    });

    describe('hash', () => {
        it('genera un hash con formato salt:digest', async () => {
            // Arrange
            const password = 'mySecurePassword123';

            // Act
            const hashed = await hasher.hash(password);

            // Assert
            expect(hashed).toContain(':');
            expect(hashed.split(':')).toHaveLength(2);
        });

        it('genera hashes diferentes para el mismo password (salt aleatorio)', async () => {
            // Arrange
            const password = 'samePassword';

            // Act
            const hash1 = await hasher.hash(password);
            const hash2 = await hasher.hash(password);

            // Assert
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('compare', () => {
        it('retorna true para password correcto', async () => {
            // Arrange
            const password = 'correctPassword';
            const hashed = await hasher.hash(password);

            // Act
            const result = await hasher.compare(password, hashed);

            // Assert
            expect(result).toBe(true);
        });

        it('retorna false para password incorrecto', async () => {
            // Arrange
            const password = 'correctPassword';
            const hashed = await hasher.hash(password);

            // Act
            const result = await hasher.compare('wrongPassword', hashed);

            // Assert
            expect(result).toBe(false);
        });

        it('retorna false si el hash tiene formato inválido', async () => {
            // Arrange
            const invalidHash = 'no-colon-here';

            // Act
            const result = await hasher.compare('anyPassword', invalidHash);

            // Assert
            expect(result).toBe(false);
        });
    });
});
