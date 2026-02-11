import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ProducerController } from './producer.controller';
import { ProducerService } from './producer.service';
import { TurnosModule } from './turnos/turnos.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // ⚕️ HUMAN CHECK - Conexión a MongoDB (lectura)
        // El Producer solo lee datos para consultar turnos por cédula
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI') || 'mongodb://admin:admin123@localhost:27017/turnos_db?authSource=admin',
            }),
            inject: [ConfigService],
        }),
        ClientsModule.registerAsync([
            {
                name: 'TURNOS_SERVICE',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        // ⚕️ HUMAN CHECK - Configuración de conexión RabbitMQ
                        // Cambiar credenciales default y usar variables de entorno seguras
                        urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
                        queue: configService.get<string>('RABBITMQ_QUEUE') || 'turnos_queue',
                        queueOptions: {
                            durable: true,
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
        TurnosModule,
    ],
    controllers: [ProducerController],
    providers: [ProducerService],
})
export class AppModule { }
