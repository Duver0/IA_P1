import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ProducerController } from './presentation/producer.controller';
import { AuthController } from './presentation/auth.controller';
import { MedicalController } from './presentation/medical.controller';
import { ConsultorioOpsController } from './presentation/consultorio-ops.controller';
import { TurnosModule } from './turnos/turnos.module';
import { EventsModule } from './events/events.module';
import { RabbitMQEventPublisher } from './infrastructure/adapters/rabbitmq-event-publisher.adapter';
import {
    ACCESS_TOKEN_VERIFIER_TOKEN,
    EVENT_PUBLISHER_TOKEN,
    OUTBOX_EVENT_PUBLISHER_TOKEN,
    OUTBOX_REPOSITORY_TOKEN,
    PASSWORD_HASHER_TOKEN,
    TOKEN_SERVICE_TOKEN,
    TURNOS_SERVICE_TOKEN,
    UNIT_OF_WORK_TOKEN,
    USER_REPOSITORY_TOKEN,
} from './domain/ports/tokens';
import { CreateTurnoUseCase } from './application/use-cases/create-turno.use-case';
import { GetAllTurnosUseCase } from './application/use-cases/get-all-turnos.use-case';
import { GetTurnosByCedulaUseCase } from './application/use-cases/get-turnos-by-cedula.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { ProcessOutboxEventsUseCase } from './application/use-cases/process-outbox-events.use-case';
import { AssignDoctorToConsultorioCommandUseCase } from './application/use-cases/assign-doctor-to-consultorio-command.use-case';
import { SetDoctorAvailabilityCommandUseCase } from './application/use-cases/set-doctor-availability-command.use-case';
import { StartMedicalAttentionCommandUseCase } from './application/use-cases/start-medical-attention-command.use-case';
import { FinalizeMedicalAttentionCommandUseCase } from './application/use-cases/finalize-medical-attention-command.use-case';
import { ReleaseConsultorioCommandUseCase } from './application/use-cases/release-consultorio-command.use-case';
import { GetConsultorioStateUseCase } from './application/use-cases/get-consultorio-state.use-case';
import { UserMongooseAdapter } from './infrastructure/adapters/user-mongoose.adapter';
import { OutboxMongooseAdapter } from './infrastructure/adapters/outbox-mongoose.adapter';
import { MongoUnitOfWorkAdapter } from './infrastructure/adapters/mongo-unit-of-work.adapter';
import { ScryptPasswordHasherAdapter } from './infrastructure/adapters/scrypt-password-hasher.adapter';
import { HmacTokenService } from './infrastructure/adapters/hmac-token.service';
import { RabbitMQOutboxEventPublisher } from './infrastructure/adapters/rabbitmq-outbox-event-publisher.adapter';
import { AuthGuard } from './presentation/auth.guard';
import { RolesGuard } from './presentation/roles.guard';
import { User, UserSchema } from './infrastructure/schemas/user.schema';
import { OutboxEvent, OutboxEventSchema } from './infrastructure/schemas/outbox-event.schema';
import { OutboxPublisherWorker } from './infrastructure/workers/outbox-publisher.worker';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const uri = configService.get<string>('MONGODB_URI');
                if (!uri) throw new Error('MONGODB_URI environment variable is required');
                return { uri };
            },
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: OutboxEvent.name, schema: OutboxEventSchema },
        ]),
        ClientsModule.registerAsync([
            {
                name: TURNOS_SERVICE_TOKEN,
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => {
                    const rabbitUrl = configService.get<string>('RABBITMQ_URL');
                    if (!rabbitUrl) throw new Error('RABBITMQ_URL environment variable is required');
                    return {
                    transport: Transport.RMQ,
                    options: {

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

        EventsModule,
    ],
    controllers: [ProducerController, AuthController, MedicalController, ConsultorioOpsController],

    providers: [
        CreateTurnoUseCase,
        GetAllTurnosUseCase,
        GetTurnosByCedulaUseCase,
        AssignDoctorToConsultorioCommandUseCase,
        SetDoctorAvailabilityCommandUseCase,
        StartMedicalAttentionCommandUseCase,
        FinalizeMedicalAttentionCommandUseCase,
        ReleaseConsultorioCommandUseCase,
        GetConsultorioStateUseCase,
        ProcessOutboxEventsUseCase,
        OutboxPublisherWorker,
        {
            provide: EVENT_PUBLISHER_TOKEN,
            useClass: RabbitMQEventPublisher,
        },
        {
            provide: OUTBOX_EVENT_PUBLISHER_TOKEN,
            useClass: RabbitMQOutboxEventPublisher,
        },
        {
            provide: USER_REPOSITORY_TOKEN,
            useClass: UserMongooseAdapter,
        },
        {
            provide: OUTBOX_REPOSITORY_TOKEN,
            useClass: OutboxMongooseAdapter,
        },
        {
            provide: UNIT_OF_WORK_TOKEN,
            useClass: MongoUnitOfWorkAdapter,
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
            useFactory: (userRepository, passwordHasher, tokenService, outboxRepository, unitOfWork) =>
                new SignupUseCase({
                    userRepository,
                    passwordHasher,
                    tokenService,
                    outboxRepository,
                    unitOfWork,
                }),
            inject: [
                USER_REPOSITORY_TOKEN,
                PASSWORD_HASHER_TOKEN,
                TOKEN_SERVICE_TOKEN,
                OUTBOX_REPOSITORY_TOKEN,
                UNIT_OF_WORK_TOKEN,
            ],
        },
        AuthGuard,
        RolesGuard,
    ],
})
export class AppModule {

    constructor(private readonly _outboxPublisherWorker: OutboxPublisherWorker) {}
}
