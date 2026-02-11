import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TurnoEstado, TurnoPriority } from '../types/turno-event';

export type TurnoDocument = HydratedDocument<Turno>;

// ⚕️ HUMAN CHECK - Schema de Turno
// Verificar que los campos y tipos sean suficientes para las necesidades del negocio
@Schema({ timestamps: true })
export class Turno {
    // ⚕️ HUMAN CHECK - Persistencia
    // Guardado como Number, campo renombrado a 'cedula'
    @Prop({ required: true })
    cedula: number;

    @Prop({ required: true })
    nombre: string;

    // ⚕️ HUMAN CHECK - Consultorio nullable
    // null cuando el paciente está en espera, se asigna por el scheduler
    @Prop({ default: null })
    consultorio: string | null;

    // ⚕️ HUMAN CHECK - Estados del turno
    // espera: recién creado, sin consultorio
    // llamado: consultorio asignado por el scheduler
    // atendido: paciente ya fue atendido
    @Prop({ default: 'espera', enum: ['espera', 'llamado', 'atendido'] })
    estado: TurnoEstado;

    // ⚕️ HUMAN CHECK - Prioridad del turno
    // Determina el orden de asignación en el scheduler
    @Prop({ default: 'media', enum: ['alta', 'media', 'baja'] })
    priority: TurnoPriority;

    // ⚕️ HUMAN CHECK - Timestamp de creación (epoch ms)
    // Usado para ordenar turnos dentro de la misma prioridad
    @Prop({ default: () => Date.now() })
    timestamp: number;
}

export const TurnoSchema = SchemaFactory.createForClass(Turno);
