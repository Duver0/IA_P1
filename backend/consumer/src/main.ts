import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ConfigurationError } from './application/errors/message-processing.error';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');


    const appContext = await NestFactory.createApplicationContext(AppModule);
    const configService = appContext.get(ConfigService);


    const rabbitUrl = configService.get<string>('RABBITMQ_URL');
    if (!rabbitUrl) {
        throw new ConfigurationError(
            'RABBITMQ_URL environment variable is required',
            'RABBITMQ_URL_MISSING',
        );
    }
    const queueName = configService.get<string>('RABBITMQ_QUEUE', 'turnos_queue');



    await appContext.close();




    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue: queueName,
            noAck: false,
            queueOptions: {
                durable: true,
            },
            prefetchCount: 1,
        },
    });



    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    await app.listen();

    logger.log(`Consumer (Worker) is listening on queue: ${queueName}`);
}
bootstrap();
