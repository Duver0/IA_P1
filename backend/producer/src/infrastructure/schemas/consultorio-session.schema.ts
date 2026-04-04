import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConsultorioSessionDocument = HydratedDocument<ConsultorioSession>;

@Schema({ _id: false })
class PacienteEnAtencionSchema {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  documento: string;
}

@Schema({ timestamps: true })
export class ConsultorioSession {
  @Prop({ required: true, unique: true, index: true })
  consultorioId: string;

  @Prop({ type: String, default: null })
  medicoId: string | null;

  @Prop({
    required: true,
    enum: ['SinMedico', 'ConMedicoDisponible', 'EnAtencion', 'ConMedicoNoDisponible'],
  })
  estado: 'SinMedico' | 'ConMedicoDisponible' | 'EnAtencion' | 'ConMedicoNoDisponible';

  @Prop({ type: PacienteEnAtencionSchema, default: null })
  pacienteEnAtencion: { nombre: string; documento: string } | null;

  updatedAt: Date;
}

export const ConsultorioSessionSchema = SchemaFactory.createForClass(ConsultorioSession);