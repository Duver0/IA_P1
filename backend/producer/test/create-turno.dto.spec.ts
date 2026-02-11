import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTurnoDto } from '../src/dto/create-turno.dto';

describe('CreateTurnoDto - Validación', () => {
    /**
     * PRUEBA 1: DTO válido
     * Verifica que un DTO con datos correctos pase validación
     */
    it('Debe validar correctamente un CreateTurnoDto válido', async () => {
        const validDto = {
            cedula: 123456789,
            nombre: 'Juan Pérez',
        };

        const dto = plainToClass(CreateTurnoDto, validDto);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
    });

    /**
     * PRUEBA 2: Cédula faltante
     * Verifica que falle si no se proporciona cedula
     */
    it('Debe fallar si falta la cédula', async () => {
        const invalidDto = {
            nombre: 'Juan Pérez',
        };

        const dto = plainToClass(CreateTurnoDto, invalidDto);
        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cedula');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    /**
     * PRUEBA 3: Nombre faltante
     * Verifica que falle si no se proporciona nombre
     */
    it('Debe fallar si falta el nombre', async () => {
        const invalidDto = {
            cedula: 123456789,
        };

        const dto = plainToClass(CreateTurnoDto, invalidDto);
        const errors = await validate(dto);

        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('nombre');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    /**
     * PRUEBA 4: Cédula inválida (string en lugar de número)
     * Verifica que falle si cedula no es número
     */
    it('Debe fallar si la cédula no es un número', async () => {
        const invalidDto = {
            cedula: 'texto-invalido',
            nombre: 'Juan Pérez',
        };

        const dto = plainToClass(CreateTurnoDto, invalidDto);
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('cedula');
    });

    /**
     * PRUEBA 5: Nombre inválido (número en lugar de string)
     * Verifica que falle si nombre no es string
     */
    it('Debe fallar si el nombre no es un string', async () => {
        const invalidDto = {
            cedula: 123456789,
            nombre: 12345,
        };

        const dto = plainToClass(CreateTurnoDto, invalidDto);
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('nombre');
    });

    /**
     * PRUEBA 6: Ambos campos faltantes
     * Verifica que falle con múltiples errores
     */
    it('Debe fallar con múltiples errores si faltan ambos campos', async () => {
        const invalidDto = {};

        const dto = plainToClass(CreateTurnoDto, invalidDto);
        const errors = await validate(dto);

        expect(errors).toHaveLength(2);
    });

    /**
     * PRUEBA 7: Cédula negativa
     * Verifica que rechace números negativos (la cédula debe ser positiva)
     */
    it('Debe rechazar cédulas negativas (la cédula debe ser un número positivo)', async () => {
        const dto = plainToClass(CreateTurnoDto, {
            cedula: -123456789,
            nombre: 'Juan Pérez',
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('cedula');
    });

    /**
     * PRUEBA 8: Nombre vacío
     * Verifica que rechace strings vacíos (porque @IsNotEmpty valida eso)
     */
    it('Debe rechazar nombres vacíos (@IsNotEmpty valida esto)', async () => {
        const dto = plainToClass(CreateTurnoDto, {
            cedula: 123456789,
            nombre: '',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('nombre');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    /**
     * PRUEBA 9: Propiedades adicionales (whitelist)
     * Verifica que plainToClass ignora propiedades extra (el whitelist se aplica en el ValidationPipe de NestJS)
     */
    it('Debe ignorar propiedades adicionales no definidas en el DTO', async () => {
        const dtoWithExtra = {
            cedula: 123456789,
            nombre: 'Juan Pérez',
            email: 'juan@example.com', // Propiedad extra
            telefono: '3001234567', // Propiedad extra
        };

        const dto = plainToClass(CreateTurnoDto, dtoWithExtra);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        // plainToClass no elimina propiedades extra automáticamente.
        // El whitelist/forbidNonWhitelisted se aplica en el ValidationPipe de NestJS
        // Aquí solo verificamos que la validación pase
    });

    /**
     * PRUEBA 10: Cédula muy grande (límite numérico)
     * Verifica que rechace números mayores a MAX_SAFE_INTEGER
     */
    it('Debe rechazar números de cédula mayores a MAX_SAFE_INTEGER', async () => {
        const dto = plainToClass(CreateTurnoDto, {
            cedula: Number.MAX_SAFE_INTEGER + 1,
            nombre: 'Juan Pérez',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cedula');
    });
});
