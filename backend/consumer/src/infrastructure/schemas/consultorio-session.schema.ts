import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ConsultorioEstado } from '../../domain/entities/consultorio-session.entity';

export type ConsultorioSessionDocument = HydratedDocument<ConsultorioSession>;

@Schema({ _id: false })
export class PacienteEnAtencionSchema {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  documento: string;
}

@Schema({ timestamps: true })
export class ConsultorioSession {
  @Prop({ required: true, unique: true, index: true })
  consultorioId: string;

  @Prop({ default: null, index: true })
  medicoId: string | null;

  @Prop({
    required: true,
    enum: ['SinMedico', 'ConMedicoDisponible', 'EnAtencion', 'ConMedicoNoDisponible'],
    default: 'SinMedico',
  })
  estado: ConsultorioEstado;

  @Prop({ type: PacienteEnAtencionSchema, default: null })
  pacienteEnAtencion: PacienteEnAtencionSchema | null;

  @Prop({ default: false })
  noDisponibleDiferido: boolean;
}

export const ConsultorioSessionSchema = SchemaFactory.createForClass(ConsultorioSession);