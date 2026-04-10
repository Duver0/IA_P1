import { Module } from '@nestjs/common';
import { TurnosGateway } from './turnos.gateway';
import { EventsController } from './events.controller';
import { RealtimeEventsBus } from './realtime-events.bus';
import { TurnosModule } from '../turnos/turnos.module';




@Module({
    imports: [TurnosModule],
    controllers: [EventsController],
    providers: [TurnosGateway, RealtimeEventsBus],
    exports: [TurnosGateway, RealtimeEventsBus],
})
export class EventsModule { }
