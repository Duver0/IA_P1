import { Module } from '@nestjs/common';
import { TurnosGateway } from './turnos.gateway';
import { EventsController } from './events.controller';
import { TurnosModule } from '../turnos/turnos.module';

// ⚕️ HUMAN CHECK - Módulo de Eventos
// Conecta el WebSocket Gateway con el controlador de eventos RabbitMQ
@Module({
    imports: [TurnosModule],
    controllers: [EventsController],
    providers: [TurnosGateway],
    exports: [TurnosGateway],
})
export class EventsModule { }
