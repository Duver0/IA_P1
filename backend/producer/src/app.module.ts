import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ProducerController } from './presentation/producer.controller';
import { AuthController } from './presentation/auth.controller';
import { TurnosModule } from './turnos/turnos.module';
import { EventsModule } from './events/events.module';
import { RabbitMQEventPublisher } from './infrastructure/adapters/rabbitmq-event-publisher.adapter';
import {
    ACCESS_TOKEN_VERIFIER_TOKEN,
    EVENT_PUBLISHER_TOKEN,
    PASSWORD_HASHER_TOKEN,
    TOKEN_SERVICE_TOKEN,
    USER_REPOSITORY_TOKEN,
} from './domain/ports/tokens';
import { CreateTurnoUseCase } from './application/use-cases/create-turno.use-case';
import { GetAllTurnosUseCase } from './application/use-cases/get-all-turnos.use-case';
import { GetTurnosByCedulaUseCase } from './application/use-cases/get-turnos-by-cedula.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { InMemoryUserRepository } from './infrastructure/adapters/in-memory-user.repository';
import { ScryptPasswordHasherAdapter } from './infrastructure/adapters/scrypt-password-hasher.adapter';
import { HmacTokenService } from './infrastructure/adapters/hmac-token.service';
import { AuthGuard } from './presentation/auth.guard';
import { RolesGuard } from './presentation/roles.guard';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // ⚕️ HUMAN CHECK - use ConfigService instead of hardcoded string
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const uri = configService.get<string>('MONGODB_URI');
                if (!uri) throw new Error('MONGODB_URI environment variable is required');
                return { uri };
            },
            inject: [ConfigService],
        }),
        ClientsModule.registerAsync([
            {
                name: 'TURNOS_SERVICE',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => {
                    const rabbitUrl = configService.get<string>('RABBITMQ_URL');
                    if (!rabbitUrl) throw new Error('RABBITMQ_URL environment variable is required');
                    return {
                    transport: Transport.RMQ,
                    options: {
                        // ⚕️ HUMAN CHECK - use ConfigService instead of hardcoded string
                        urls: [rabbitUrl],
                        queue: configService.get<string>('RABBITMQ_QUEUE', 'turnos_queue'),
                        queueOptions: {
                            durable: true,
                        },
                    },
                };
                },
                inject: [ConfigService],
            },
        ]),
        TurnosModule,
        // ⚕️ HUMAN CHECK - Módulo de Eventos (WebSocket + RabbitMQ listener)
        EventsModule,
    ],
    controllers: [ProducerController, AuthController],
    // ⚕️ HUMAN CHECK - DIP: Use Cases inyectan puertos, registrados con tokens
    providers: [
        CreateTurnoUseCase,
        GetAllTurnosUseCase,
        GetTurnosByCedulaUseCase,
        {
            provide: EVENT_PUBLISHER_TOKEN,
            useClass: RabbitMQEventPublisher,
        },
        {
            provide: USER_REPOSITORY_TOKEN,
            useClass: InMemoryUserRepository,
        },
        {
            provide: PASSWORD_HASHER_TOKEN,
            useClass: ScryptPasswordHasherAdapter,
        },
        {
            provide: TOKEN_SERVICE_TOKEN,
            useClass: HmacTokenService,
        },
        {
            provide: ACCESS_TOKEN_VERIFIER_TOKEN,
            useExisting: TOKEN_SERVICE_TOKEN,
        },
        {
            provide: LoginUseCase,
            useFactory: (userRepository, passwordHasher, tokenService) =>
                new LoginUseCase({ userRepository, passwordHasher, tokenService }),
            inject: [USER_REPOSITORY_TOKEN, PASSWORD_HASHER_TOKEN, TOKEN_SERVICE_TOKEN],
        },
        {
            provide: SignupUseCase,
            useFactory: (userRepository, passwordHasher, tokenService) =>
                new SignupUseCase({ userRepository, passwordHasher, tokenService }),
            inject: [USER_REPOSITORY_TOKEN, PASSWORD_HASHER_TOKEN, TOKEN_SERVICE_TOKEN],
        },
        AuthGuard,
        RolesGuard,
    ],
})
export class AppModule { }
