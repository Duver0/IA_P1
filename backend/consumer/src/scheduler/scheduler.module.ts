import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TurnosModule } from '../turnos/turnos.module';

@Module({
    imports: [TurnosModule],
    providers: [SchedulerService],
    exports: [SchedulerService],
})
export class SchedulerModule { }
