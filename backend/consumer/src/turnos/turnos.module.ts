import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Turno, TurnoSchema } from '../infrastructure/schemas/turno.schema';
import { Doctor, DoctorSchema } from '../infrastructure/schemas/doctor.schema';
import {
    ConsultorioSession,
    ConsultorioSessionSchema,
} from '../infrastructure/schemas/consultorio-session.schema';
import { TurnoMongooseAdapter } from '../infrastructure/adapters/turno-mongoose.adapter';
import { StandardPrioritySortingStrategy } from '../infrastructure/adapters/standard-priority-sorting.strategy';
import { DoctorMongooseAdapter } from '../infrastructure/adapters/doctor-mongoose.adapter';
import { ConsultorioSessionMongooseAdapter } from '../infrastructure/adapters/consultorio-session-mongoose.adapter';
import {
    TURNO_REPOSITORY_TOKEN,
    PRIORITY_SORTING_STRATEGY_TOKEN,
    DOCTOR_REPOSITORY_TOKEN,
    CONSULTORIO_SESSION_REPOSITORY_TOKEN,
} from '../domain/ports/tokens';

// ⚕️ HUMAN CHECK - Adapter registrado con token de inyección (DIP)
// Para tests, reemplazar useClass por TurnoInMemoryAdapter
// Para nueva estrategia de prioridad, reemplazar StandardPrioritySortingStrategy
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Turno.name, schema: TurnoSchema },
            { name: Doctor.name, schema: DoctorSchema },
            { name: ConsultorioSession.name, schema: ConsultorioSessionSchema },
        ]),
    ],
    providers: [
        {
            provide: TURNO_REPOSITORY_TOKEN,
            useClass: TurnoMongooseAdapter,
        },
        {
            provide: PRIORITY_SORTING_STRATEGY_TOKEN,
            useClass: StandardPrioritySortingStrategy,
        },
        {
            provide: DOCTOR_REPOSITORY_TOKEN,
            useClass: DoctorMongooseAdapter,
        },
        {
            provide: CONSULTORIO_SESSION_REPOSITORY_TOKEN,
            useClass: ConsultorioSessionMongooseAdapter,
        },
    ],
    exports: [
        TURNO_REPOSITORY_TOKEN,
        PRIORITY_SORTING_STRATEGY_TOKEN,
        DOCTOR_REPOSITORY_TOKEN,
        CONSULTORIO_SESSION_REPOSITORY_TOKEN,
    ],
})
export class TurnosModule { }
