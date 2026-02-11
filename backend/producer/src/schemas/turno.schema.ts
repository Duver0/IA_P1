import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TurnoDocument = HydratedDocument<Turno>;

@Schema({ timestamps: true })
export class Turno {
    @Prop({ required: true })
    pacienteId: string;

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    consultorio: number;

    @Prop({ default: 'asignado' })
    estado: string;
}

export const TurnoSchema = SchemaFactory.createForClass(Turno);
