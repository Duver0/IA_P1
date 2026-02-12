import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TurnoEstado, TurnoPriority } from '../types/turno-event';

export type TurnoDocument = HydratedDocument<Turno>;

// ⚕️ HUMAN CHECK - Schema de Turno (Producer - lectura)
// Debe estar sincronizado con el schema del Consumer
@Schema({ timestamps: true })
export class Turno {
    // ⚕️ HUMAN CHECK - Persistencia
    // Guardado como Number, campo renombrado a 'cedula'
    @Prop({ required: true })
    cedula: number;

    @Prop({ required: true })
    nombre: string;

    // ⚕️ HUMAN CHECK - Consultorio nullable
    // null cuando el paciente está en espera
    @Prop({ default: null })
    consultorio: string | null;

    // ⚕️ HUMAN CHECK - Estados del turno
    @Prop({ default: 'espera', enum: ['espera', 'llamado', 'atendido'] })
    estado: TurnoEstado;

    // ⚕️ HUMAN CHECK - Prioridad del turno
    @Prop({ default: 'media', enum: ['alta', 'media', 'baja'] })
    priority: TurnoPriority;

    // ⚕️ HUMAN CHECK - Timestamp de creación (epoch ms)
    @Prop({ default: () => Date.now() })
    timestamp: number;

    // ⚕️ HUMAN CHECK - Timestamp de fin de atención
    @Prop({ default: null })
    finAtencionAt: number | null;
}

export const TurnoSchema = SchemaFactory.createForClass(Turno);
