import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IConsultorioStateReader } from '../../domain/ports/IConsultorioStateReader';
import { ConsultorioStateView } from '../../domain/views/consultorio-state.view';
import {
  ConsultorioSession,
  ConsultorioSessionDocument,
} from '../schemas/consultorio-session.schema';

@Injectable()
export class ConsultorioStateMongooseAdapter implements IConsultorioStateReader {
  constructor(
    @InjectModel(ConsultorioSession.name)
    private readonly consultorioSessionModel: Model<ConsultorioSessionDocument>,
  ) {}

  async findByConsultorioId(consultorioId: string): Promise<ConsultorioStateView | null> {
    const doc = await this.consultorioSessionModel.findOne({ consultorioId }).exec();

    if (!doc) {
      return null;
    }

    return {
      consultorioId: doc.consultorioId,
      medicoId: doc.medicoId ?? null,
      estado: doc.estado,
      patientId: doc.pacienteEnAtencion?.documento ?? null,
      timestamp: doc.updatedAt instanceof Date ? doc.updatedAt.getTime() : Date.now(),
    };
  }
}