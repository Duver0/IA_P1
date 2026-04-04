import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Turno, TurnoSchema } from '../infrastructure/schemas/turno.schema';
import {
    ConsultorioSession,
    ConsultorioSessionSchema,
} from '../infrastructure/schemas/consultorio-session.schema';
import { TurnoMongooseAdapter } from '../infrastructure/adapters/turno-mongoose.adapter';
import { ConsultorioStateMongooseAdapter } from '../infrastructure/adapters/consultorio-state-mongoose.adapter';
import { CONSULTORIO_STATE_READER_TOKEN, TURNO_REPOSITORY_TOKEN } from '../domain/ports/tokens';

// ⚕️ HUMAN CHECK - Adapter registrado con token de inyección (DIP)
// Para tests, reemplazar useClass por TurnoInMemoryAdapter
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Turno.name, schema: TurnoSchema },
            { name: ConsultorioSession.name, schema: ConsultorioSessionSchema },
        ]),
    ],
    providers: [
        {
            provide: TURNO_REPOSITORY_TOKEN,
            useClass: TurnoMongooseAdapter,
        },
        {
            provide: CONSULTORIO_STATE_READER_TOKEN,
            useClass: ConsultorioStateMongooseAdapter,
        },
    ],
    exports: [TURNO_REPOSITORY_TOKEN, CONSULTORIO_STATE_READER_TOKEN],
})
export class TurnosModule { }
