import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { HmacTokenService } from '../../../src/infrastructure/adapters/hmac-token.service';

describe('HmacTokenService (Infrastructure)', () => {
    const TEST_SECRET = 'test-secret';
    const configService: Pick<ConfigService, 'get'> = {
        get: jest.fn().mockReturnValue(TEST_SECRET),
    };

    let service: HmacTokenService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new HmacTokenService(configService as ConfigService);
    });

    // Helper para firmar data con el mismo algoritmo
    const signData = (data: string): string => {
        return createHmac('sha256', TEST_SECRET).update(data).digest('base64url');
    };

    describe('generateToken', () => {
        it('genera un token con formato data.signature', () => {
            // Arrange
            const payload = { userId: '123', email: 'test@test.com' };

            // Act
            const token = service.generateToken(payload);

            // Assert
            expect(token).toContain('.');
            expect(token.split('.')).toHaveLength(2);
        });
    });

    describe('verifyToken', () => {
        it('verifica un token válido y retorna el payload', () => {
            // Arrange
            const payload = { userId: '123', email: 'test@test.com' };
            const token = service.generateToken(payload);

            // Act
            const result = service.verifyToken(token);

            // Assert
            expect(result).toEqual(payload);
        });

        it('retorna null si el token tiene formato inválido', () => {
            // Arrange
            const invalidToken = 'invalid-token-without-dot';

            // Act
            const result = service.verifyToken(invalidToken);

            // Assert
            expect(result).toBeNull();
        });

        it('retorna null si la firma no coincide', () => {
            // Arrange
            const payload = { userId: '123' };
            const token = service.generateToken(payload);
            const [data] = token.split('.');
            const tamperedToken = `${data}.wrong-signature`;

            // Act
            const result = service.verifyToken(tamperedToken);

            // Assert
            expect(result).toBeNull();
        });

        it('retorna null si el payload no es JSON válido', () => {
            // Arrange: crear token con data base64 válida pero no es JSON
            const notJsonData = Buffer.from('not-valid-json', 'utf8').toString('base64url');
            const validSignature = signData(notJsonData);
            const tokenWithInvalidJson = `${notJsonData}.${validSignature}`;

            // Act
            const result = service.verifyToken(tokenWithInvalidJson);

            // Assert
            expect(result).toBeNull();
        });
    });
});
