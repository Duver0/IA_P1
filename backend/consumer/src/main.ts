import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    // Primero creamos el contexto de aplicación para acceder al ConfigService
    const appContext = await NestFactory.createApplicationContext(AppModule);
    const configService = appContext.get(ConfigService);

    const rabbitUrl = configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
    const queueName = configService.get<string>('RABBITMQ_QUEUE') || 'turnos_queue';

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

    await app.listen();
    console.log(`Consumer (Worker) is listening on queue: ${queueName}`);
}
bootstrap();
