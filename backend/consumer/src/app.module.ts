import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConsumerController } from './consumer.controller';
import { TurnosModule } from './turnos/turnos.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // ⚕️ HUMAN CHECK - Módulo de Schedule
        // Habilita el uso de @Interval y @Cron para el scheduler
        ScheduleModule.forRoot(),
        // ⚕️ HUMAN CHECK - Conexión a MongoDB
        // Verificar que la URI de conexión sea correcta y accesible desde el contenedor
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI') || 'mongodb://admin:admin123@localhost:27017/turnos_db?authSource=admin',
            }),
            inject: [ConfigService],
        }),
        // ⚕️ HUMAN CHECK - Cliente RabbitMQ para notificaciones
        // Publica eventos (turno_creado, turno_actualizado) al exchange de notificaciones
        // que el Producer escucha para hacer broadcast por WebSocket
        NotificationsModule,
        SchedulerModule,
        TurnosModule,
    ],
    controllers: [ConsumerController],
    providers: [],
})
export class AppModule { }
