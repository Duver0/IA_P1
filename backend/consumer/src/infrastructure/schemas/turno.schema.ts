import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TurnoEstado, TurnoPriority } from '../../domain/entities/turno.entity';

export type TurnoDocument = HydratedDocument<Turno>;



@Schema({ timestamps: true })
export class Turno {


    @Prop({ required: true })
    cedula: number;

    @Prop({ required: true })
    nombre: string;



    @Prop({ default: null })
    consultorio: string | null;





    @Prop({ default: 'espera', enum: ['espera', 'llamado', 'atendido'] })
    estado: TurnoEstado;



    @Prop({ default: 'media', enum: ['alta', 'media', 'baja'] })
    priority: TurnoPriority;



    @Prop({ default: () => Date.now() })
    timestamp: number;



    @Prop({ default: null })
    finAtencionAt: number | null;
}

export const TurnoSchema = SchemaFactory.createForClass(Turno);
