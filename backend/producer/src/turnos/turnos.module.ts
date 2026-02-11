import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Turno, TurnoSchema } from '../schemas/turno.schema';
import { TurnosService } from './turnos.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Turno.name, schema: TurnoSchema }]),
    ],
    providers: [TurnosService],
    exports: [TurnosService],
})
export class TurnosModule { }
