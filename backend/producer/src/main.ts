import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'reflect-metadata';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Habilitar validación global (class-validator)
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    const configService = app.get(ConfigService);
    const port = configService.get('PORT') || 3000;

    await app.listen(port);
    console.log(`Producer running on port ${port}`);
}
bootstrap();
