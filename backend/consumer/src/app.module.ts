import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsumerController } from './consumer.controller';
import { TurnosModule } from './turnos/turnos.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // ⚕️ HUMAN CHECK - Conexión a MongoDB
        // Verificar que la URI de conexión sea correcta y accesible desde el contenedor
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI') || 'mongodb://admin:admin123@localhost:27017/turnos_db?authSource=admin',
            }),
            inject: [ConfigService],
        }),
        TurnosModule,
        NotificationsModule,
    ],
    controllers: [ConsumerController],
    providers: [],
})
export class AppModule { }
