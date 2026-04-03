// ⚕️ HUMAN CHECK - Step Definitions: Registro de usuario (Caja Negra)
// Valida el flujo de registro y login vía HTTP como consumidor externo.
// En estos escenarios se usa InMemory como doble determinístico de pruebas.

import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../../../src/presentation/auth.controller';
import { SignupUseCase } from '../../../src/application/use-cases/signup.use-case';
import { LoginUseCase } from '../../../src/application/use-cases/login.use-case';
import { GetAllTurnosUseCase } from '../../../src/application/use-cases/get-all-turnos.use-case';
import { InMemoryUserRepository } from '../../../src/infrastructure/adapters/in-memory-user.repository';
import { ScryptPasswordHasherAdapter } from '../../../src/infrastructure/adapters/scrypt-password-hasher.adapter';
import { HmacTokenService } from '../../../src/infrastructure/adapters/hmac-token.service';
import {
    PASSWORD_HASHER_TOKEN,
    TOKEN_SERVICE_TOKEN,
    OUTBOX_REPOSITORY_TOKEN,
    UNIT_OF_WORK_TOKEN,
    USER_REPOSITORY_TOKEN,
    TURNO_REPOSITORY_TOKEN,
    ACCESS_TOKEN_VERIFIER_TOKEN,
} from '../../../src/domain/ports/tokens';
import { IOutboxRepository } from '../../../src/domain/ports/IOutboxRepository';
import { IUnitOfWork } from '../../../src/domain/ports/IUnitOfWork';
import { ConfigModule } from '@nestjs/config';

setDefaultTimeout(30_000);

// ── Stubs ──────────────────────────────────────────────────────────────────
const stubOutboxRepository: IOutboxRepository = {
    insert: async () => undefined,
    findPublishable: async () => [],
    claimForPublishing: async () => false,
    markProcessed: async () => undefined,
    markFailed: async () => undefined,
};

const passthroughUnitOfWork: IUnitOfWork = {
    execute: async <T>(work: (transaction: { kind: 'mongo'; value: unknown }) => Promise<T>) =>
        work({ kind: 'mongo', value: { source: 'acceptance-test' } }),
};

const stubTurnoRepository = {
    findAll: async () => [],
    findByCedula: async () => [],
};

// ── World state ────────────────────────────────────────────────────────────
let app: INestApplication;
let response: request.Response;

Before({ tags: '@auth or not @turnos' }, async function () {
    // Solo inicializa si no hay app activa del otro feature
    if (app) return;

    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true })],
        controllers: [AuthController],
        providers: [
            GetAllTurnosUseCase,
            InMemoryUserRepository,
            ScryptPasswordHasherAdapter,
            HmacTokenService,
            { provide: TURNO_REPOSITORY_TOKEN, useValue: stubTurnoRepository },
            { provide: OUTBOX_REPOSITORY_TOKEN, useValue: stubOutboxRepository },
            { provide: UNIT_OF_WORK_TOKEN, useValue: passthroughUnitOfWork },
            { provide: USER_REPOSITORY_TOKEN, useExisting: InMemoryUserRepository },
            { provide: PASSWORD_HASHER_TOKEN, useExisting: ScryptPasswordHasherAdapter },
            { provide: TOKEN_SERVICE_TOKEN, useExisting: HmacTokenService },
            { provide: ACCESS_TOKEN_VERIFIER_TOKEN, useExisting: HmacTokenService },
            {
                provide: LoginUseCase,
                useFactory: (ur: InMemoryUserRepository, ph: ScryptPasswordHasherAdapter, ts: HmacTokenService) =>
                    new LoginUseCase({ userRepository: ur, passwordHasher: ph, tokenService: ts }),
                inject: [USER_REPOSITORY_TOKEN, PASSWORD_HASHER_TOKEN, TOKEN_SERVICE_TOKEN],
            },
            {
                provide: SignupUseCase,
                useFactory: (
                    ur: InMemoryUserRepository,
                    ph: ScryptPasswordHasherAdapter,
                    ts: HmacTokenService,
                    or: IOutboxRepository,
                    uow: IUnitOfWork,
                ) =>
                    new SignupUseCase({
                        userRepository: ur,
                        passwordHasher: ph,
                        tokenService: ts,
                        outboxRepository: or,
                        unitOfWork: uow,
                    }),
                inject: [
                    USER_REPOSITORY_TOKEN,
                    PASSWORD_HASHER_TOKEN,
                    TOKEN_SERVICE_TOKEN,
                    OUTBOX_REPOSITORY_TOKEN,
                    UNIT_OF_WORK_TOKEN,
                ],
            },
        ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
});

After(async function () {
    if (app) {
        await app.close();
        app = undefined as unknown as INestApplication;
    }
});

// ── Given ──────────────────────────────────────────────────────────────────

Given('el sistema de autenticación está disponible', function () {
    if (!app) throw new Error('La aplicación de auth no se inicializó');
});

Given('no existe un usuario registrado con correo {string}', function (_email: string) {
    // Estado inicial: InMemoryUserRepository vacío
    // No se requiere acción — el repositorio se reinicia en cada escenario
});

Given('existe un usuario registrado con correo {string}', async function (email: string) {
    // Pre-condición: registrar usuario para que exista antes del When
    await request(app.getHttpServer())
        .post('/auth/signUp')
        .send({ email, password: 'SecurePass1!', nombre: 'Pre-existente', rol: 'empleado' });
});

Given(
    'existe un usuario registrado con correo {string} y contraseña {string}',
    async function (email: string, password: string) {
        await request(app.getHttpServer())
            .post('/auth/signUp')
            .send({ email, password, nombre: 'Usuario Test', rol: 'empleado' });
    },
);

// ── When ───────────────────────────────────────────────────────────────────

When(
    'se registra un usuario con nombre {string}, correo {string}, contraseña {string} y rol {string}',
    async function (nombre: string, email: string, password: string, rol: string) {
        response = await request(app.getHttpServer())
            .post('/auth/signUp')
            .send({ email, password, nombre, rol })
            .set('Content-Type', 'application/json');
    },
);

When('se intenta registrar otro usuario con correo {string}', async function (email: string) {
    response = await request(app.getHttpServer())
        .post('/auth/signUp')
        .send({ email, password: 'AnotherPass1!', nombre: 'Otro User', rol: 'empleado' })
        .set('Content-Type', 'application/json');
});

When(
    'el usuario inicia sesión con correo {string} y contraseña {string}',
    async function (email: string, password: string) {
        response = await request(app.getHttpServer())
            .post('/auth/signIn')
            .send({ email, password })
            .set('Content-Type', 'application/json');
    },
);

// ── Then ───────────────────────────────────────────────────────────────────

Then('el registro es exitoso', function () {
    if (!response.body.success) {
        throw new Error(`Registro fallido: ${response.body.message}`);
    }
});

Then('se obtiene un token de acceso válido', function () {
    if (!response.body.token || typeof response.body.token !== 'string' || response.body.token.length < 10) {
        throw new Error(`Token inválido o ausente: ${JSON.stringify(response.body)}`);
    }
});

Then(
    'los datos del usuario contienen nombre {string} y rol {string}',
    function (nombre: string, rol: string) {
        const usuario = response.body.usuario;
        if (!usuario) throw new Error('No se recibió objeto usuario en la respuesta');
        if (usuario.nombre !== nombre) throw new Error(`Nombre esperado "${nombre}", recibido "${usuario.nombre}"`);
        if (usuario.rol !== rol) throw new Error(`Rol esperado "${rol}", recibido "${usuario.rol}"`);
    },
);

Then('el registro es rechazado', function () {
    if (response.body.success !== false) {
        throw new Error(`Se esperaba registro rechazado, pero success=${response.body.success}`);
    }
});

Then('el mensaje de error indica {string}', function (expectedMessage: string) {
    if (!response.body.message?.includes(expectedMessage)) {
        throw new Error(`Esperaba mensaje "${expectedMessage}", recibió "${response.body.message}"`);
    }
});

Then('la autenticación es exitosa', function () {
    if (!response.body.success) {
        throw new Error(`Login fallido: ${response.body.message}`);
    }
});
