import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TurnosModule } from '../turnos/turnos.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [TurnosModule, NotificationsModule],
    providers: [SchedulerService],
    exports: [SchedulerService],
})
export class SchedulerModule { }
