import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IConsultorioStateReader } from '../../domain/ports/IConsultorioStateReader';
import { ConsultorioStateView } from '../../domain/views/consultorio-state.view';
import {
  ConsultorioSession,
  ConsultorioSessionDocument,
} from '../schemas/consultorio-session.schema';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class ConsultorioStateMongooseAdapter implements IConsultorioStateReader {
  constructor(
    @InjectModel(ConsultorioSession.name)
    private readonly consultorioSessionModel: Model<ConsultorioSessionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByConsultorioId(consultorioId: string): Promise<ConsultorioStateView | null> {
    const doc = await this.consultorioSessionModel.findOne({ consultorioId }).exec();

    if (!doc) {
      return null;
    }

    const medicoNombre = doc.medicoId
      ? (
          await this.userModel
            .findOne({ _id: doc.medicoId, rol: 'medico' })
            .select('nombre')
            .lean()
            .exec()
        )?.nombre ?? null
      : null;

    return {
      consultorioId: doc.consultorioId,
      medicoId: doc.medicoId ?? null,
      medicoNombre,
      estado: doc.estado,
      patientId: doc.pacienteEnAtencion?.documento ?? null,
      timestamp: doc.updatedAt instanceof Date ? doc.updatedAt.getTime() : Date.now(),
    };
  }
}