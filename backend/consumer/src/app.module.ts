import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ConsumerController } from './presentation/consumer.controller';
import { TurnosModule } from './turnos/turnos.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { RabbitMQEventPublisher } from './infrastructure/adapters/rabbitmq-event-publisher.adapter';
import { NotificationsService } from './notifications/notifications.service';
import { EVENT_PUBLISHER_TOKEN, NOTIFICATION_GATEWAY_TOKEN } from './domain/ports/tokens';
import { CreateTurnoUseCase } from './application/use-cases/create-turno.use-case';
import { AssignPatientToConsultorioUseCase } from './application/use-cases/assign-patient-to-consultorio.use-case';
import { AssignDoctorToConsultorioUseCase } from './application/use-cases/assign-doctor-to-consultorio.use-case';
import { SetDoctorAvailabilityUseCase } from './application/use-cases/set-doctor-availability.use-case';
import { StartMedicalAttentionUseCase } from './application/use-cases/start-medical-attention.use-case';
import { FinalizeMedicalAttentionUseCase } from './application/use-cases/finalize-medical-attention.use-case';
import { ReleaseConsultorioUseCase } from './application/use-cases/release-consultorio.use-case';
import { ProvisionDoctorFromUserUseCase } from './application/use-cases/provision-doctor-from-user.use-case';
import { ConfigurationError } from './application/errors/message-processing.error';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        ScheduleModule.forRoot(),

        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const uri = configService.get<string>('MONGODB_URI');
                if (!uri) {
                    throw new ConfigurationError(
                        'MONGODB_URI environment variable is required',
                        'MONGODB_URI_MISSING',
                    );
                }
                return { uri };
            },
            inject: [ConfigService],
        }),
        NotificationsModule,
        SchedulerModule,
        TurnosModule,
    ],
    controllers: [ConsumerController],

    providers: [
        CreateTurnoUseCase,
        AssignPatientToConsultorioUseCase,
        AssignDoctorToConsultorioUseCase,
        SetDoctorAvailabilityUseCase,
        StartMedicalAttentionUseCase,
        FinalizeMedicalAttentionUseCase,
        ReleaseConsultorioUseCase,
        ProvisionDoctorFromUserUseCase,
        {
            provide: EVENT_PUBLISHER_TOKEN,
            useClass: RabbitMQEventPublisher,
        },
        {
            provide: NOTIFICATION_GATEWAY_TOKEN,
            useExisting: NotificationsService,
        },
    ],
})
export class AppModule { }
