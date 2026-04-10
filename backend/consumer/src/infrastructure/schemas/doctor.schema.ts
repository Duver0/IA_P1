import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DoctorDocument = HydratedDocument<Doctor>;

@Schema({ timestamps: true })
export class Doctor {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: null, index: true })
  consultorioId: string | null;

  @Prop({ default: true })
  disponible: boolean;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);