import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import 'reflect-metadata';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // ⚕️ HUMAN CHECK - CORS habilitado para desarrollo
    // En producción, restringir a los dominios permitidos
    app.enableCors({
        origin: '*',
    });

    // Habilitar validación global (class-validator)
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    // ⚕️ HUMAN CHECK - Configuración de Swagger
    // Revisar que la info sea correcta antes de desplegar
    const config = new DocumentBuilder()
        .setTitle('API de Turnos Médicos')
        .setDescription(
            'API para la gestión de turnos médicos. ' +
            'Recibe solicitudes de turno y las envía a una cola RabbitMQ para procesamiento asíncrono. ' +
            'El turno es asignado a un consultorio por un scheduler cada 15 segundos. ' +
            'Los cambios se emiten en tiempo real via WebSocket en /ws/turnos.'
        )
        .setVersion('2.0')
        .addTag('Turnos', 'Operaciones de gestión de turnos médicos')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') ?? 3000;

    // ⚕️ HUMAN CHECK - Hybrid App: HTTP + Microservice (RabbitMQ listener)
    // El Producer escucha eventos del Consumer (turno_creado, turno_actualizado)
    // para reenviarlos por WebSocket a los clientes conectados
    const rabbitUrl = configService.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';
    const notificationsQueue = configService.get<string>('RABBITMQ_NOTIFICATIONS_QUEUE') ?? 'turnos_notifications';

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue: notificationsQueue,
            queueOptions: {
                durable: true,
            },
            noAck: true,
        },
    });

    await app.startAllMicroservices();
    await app.listen(port);

    // ⚕️ HUMAN CHECK - Reemplazado console.log por Logger (consistencia)
    logger.log(`Producer running on port ${port}`);
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`WebSocket: ws://localhost:${port}/ws/turnos`);
    logger.log(`Listening for notifications on queue: ${notificationsQueue}`);
}
bootstrap();
