import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TurnoDocument = HydratedDocument<Turno>;

@Schema({ timestamps: true })
export class Turno {
    // ⚕️ HUMAN CHECK - Persistencia
    // Guardado como Number
    @Prop({ required: true })
    pacienteId: number;

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    consultorio: number;

    @Prop({ default: 'asignado' })
    estado: string;
}

export const TurnoSchema = SchemaFactory.createForClass(Turno);
