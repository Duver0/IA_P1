import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ConsultorioEstado } from '../../domain/entities/consultorio-session.entity';

export type ProcessedMedicalCommandDocument = HydratedDocument<ProcessedMedicalCommand>;

@Schema({ _id: false })
export class SessionSnapshot {
  @Prop({ required: true })
  consultorioId: string;

  @Prop({ default: null })
  medicoId: string | null;

  @Prop({ required: true, enum: ['SinMedico', 'ConMedicoDisponible', 'EnAtencion', 'ConMedicoNoDisponible'] })
  estado: ConsultorioEstado;

  @Prop({
    type: {
      nombre: { type: String, required: true },
      documento: { type: String, required: true },
    },
    default: null,
  })
  pacienteEnAtencion: {
    nombre: string;
    documento: string;
  } | null;

  @Prop({ default: false })
  noDisponibleDiferido: boolean;
}

@Schema({ timestamps: true })
export class ProcessedMedicalCommand {
  @Prop({ required: true, unique: true, index: true })
  commandId: string;

  @Prop({ required: true, index: true })
  operation: string;

  @Prop({ required: true, enum: ['processing', 'completed'], default: 'processing' })
  status: 'processing' | 'completed';

  @Prop({ type: SessionSnapshot, default: null })
  sessionSnapshot: SessionSnapshot | null;
}

export const ProcessedMedicalCommandSchema = SchemaFactory.createForClass(ProcessedMedicalCommand);