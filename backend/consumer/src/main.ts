import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');

    // Primero creamos el contexto de aplicación para acceder al ConfigService
    const appContext = await NestFactory.createApplicationContext(AppModule);
    const configService = appContext.get(ConfigService);

    // ⚕️ HUMAN CHECK - Reemplazado || por ?? (null-safe)
    const rabbitUrl = configService.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';
    const queueName = configService.get<string>('RABBITMQ_QUEUE') ?? 'turnos_queue';

    // ⚕️ HUMAN CHECK - Cerrar appContext antes de crear el microservicio
    // Evita doble inicialización de módulos (memory leak potencial)
    await appContext.close();

    // ⚕️ HUMAN CHECK - Configuración de Microservicio
    // Verificar que la URL y el nombre de la cola coincidan con los del Producer
    // y que los puertos de RabbitMQ estén accesibles desde el contenedor.
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue: queueName,
            noAck: false, // Importante para confirmación manual
            queueOptions: {
                durable: true,
            },
            prefetchCount: 1, // Procesar uno a la vez para evitar sobrecarga
        },
    });

    // ⚕️ HUMAN CHECK - Validación global en microservicio
    // Se habilita ValidationPipe para eventos RMQ (whitelist + forbid + transform)
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    await app.listen();
    // ⚕️ HUMAN CHECK - Reemplazado console.log por Logger
    logger.log(`Consumer (Worker) is listening on queue: ${queueName}`);
}
bootstrap();
