import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  ConsultorioSession as ConsultorioSessionSchema,
  ConsultorioSessionDocument,
} from '../schemas/consultorio-session.schema';
import { ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { NonRecoverableInfraError } from '../../domain/errors/message-processing.error';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { TransactionContext } from '../../domain/ports/IUnitOfWork';

@Injectable()
export class ConsultorioSessionMongooseAdapter implements IConsultorioSessionRepository {
  constructor(
    @InjectModel(ConsultorioSessionSchema.name)
    private readonly consultorioSessionModel: Model<ConsultorioSessionDocument>,
  ) {}

  async findByConsultorioId(consultorioId: string, tx?: TransactionContext): Promise<ConsultorioSession | null> {
    const query = this.consultorioSessionModel.findOne({ consultorioId });
    const session = this.resolveMongoSession(tx);
    if (session) {
      query.session(session);
    }

    const doc = await query.exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByMedicoId(medicoId: string, tx?: TransactionContext): Promise<ConsultorioSession | null> {
    const query = this.consultorioSessionModel.findOne({ medicoId });
    const session = this.resolveMongoSession(tx);
    if (session) {
      query.session(session);
    }

    const doc = await query.exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(sessionSnapshot: ConsultorioSession, tx?: TransactionContext): Promise<ConsultorioSession> {
    const session = this.resolveMongoSession(tx);
    const update = {
      consultorioId: sessionSnapshot.consultorioId,
      medicoId: sessionSnapshot.medicoId,
      estado: sessionSnapshot.estado,
      pacienteEnAtencion: sessionSnapshot.pacienteEnAtencion,
      noDisponibleDiferido: sessionSnapshot.noDisponibleDiferido,
    };

    const options = {
      returnDocument: 'after' as const,
      upsert: true,
      setDefaultsOnInsert: true,
      ...(session ? { session } : {}),
    };

    const doc = await this.consultorioSessionModel.findOneAndUpdate(
      { consultorioId: sessionSnapshot.consultorioId },
      update,
      options,
    ).exec();

    if (!doc) {
      throw new NonRecoverableInfraError(
        'No fue posible persistir la sesion de consultorio',
        'CONSULTORIO_SESSION_PERSISTENCE_FAILURE',
      );
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

  private resolveMongoSession(tx?: TransactionContext): ClientSession | null {
    if (!tx || tx.kind !== 'mongo' || !tx.value) {
      return null;
    }

    return tx.value as ClientSession;
  }
}