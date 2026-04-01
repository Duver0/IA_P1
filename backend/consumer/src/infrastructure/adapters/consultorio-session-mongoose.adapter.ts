import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ConsultorioSession as ConsultorioSessionSchema,
  ConsultorioSessionDocument,
} from '../schemas/consultorio-session.schema';
import { ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';

@Injectable()
export class ConsultorioSessionMongooseAdapter implements IConsultorioSessionRepository {
  constructor(
    @InjectModel(ConsultorioSessionSchema.name)
    private readonly consultorioSessionModel: Model<ConsultorioSessionDocument>,
  ) {}

  async findByConsultorioId(consultorioId: string): Promise<ConsultorioSession | null> {
    const doc = await this.consultorioSessionModel.findOne({ consultorioId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByMedicoId(medicoId: string): Promise<ConsultorioSession | null> {
    const doc = await this.consultorioSessionModel.findOne({ medicoId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(session: ConsultorioSession): Promise<ConsultorioSession> {
    const doc = await this.consultorioSessionModel.findOneAndUpdate(
      { consultorioId: session.consultorioId },
      {
        consultorioId: session.consultorioId,
        medicoId: session.medicoId,
        estado: session.estado,
        pacienteEnAtencion: session.pacienteEnAtencion,
        noDisponibleDiferido: session.noDisponibleDiferido,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!doc) {
      throw new Error('No fue posible persistir la sesion de consultorio');
    }

    return this.toDomain(doc);
  }

  private toDomain(doc: ConsultorioSessionDocument): ConsultorioSession {
    return new ConsultorioSession({
      consultorioId: doc.consultorioId,
      medicoId: doc.medicoId,
      estado: doc.estado,
      pacienteEnAtencion: doc.pacienteEnAtencion
        ? {
            nombre: doc.pacienteEnAtencion.nombre,
            documento: doc.pacienteEnAtencion.documento,
          }
        : null,
      noDisponibleDiferido: doc.noDisponibleDiferido,
    });
  }
}