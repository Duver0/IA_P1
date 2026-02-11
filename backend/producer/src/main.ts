import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Habilitar validación global (class-validator)
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    // ⚕️ HUMAN CHECK - Configuración de Swagger
    // Revisar que la info sea correcta antes de desplegar
    const config = new DocumentBuilder()
        .setTitle('API de Turnos Médicos')
        .setDescription(
            'API para la gestión de turnos médicos. ' +
            'Recibe solicitudes de turno y las envía a una cola RabbitMQ para procesamiento asíncrono. ' +
            'El turno es asignado a un consultorio y persistido en MongoDB por el servicio Consumer.'
        )
        .setVersion('1.0')
        .addTag('Turnos', 'Operaciones de gestión de turnos médicos')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const configService = app.get(ConfigService);
    const port = configService.get('PORT') || 3000;

    await app.listen(port);
    console.log(`Producer running on port ${port}`);
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
