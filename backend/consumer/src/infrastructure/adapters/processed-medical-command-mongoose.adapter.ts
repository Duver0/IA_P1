import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { IProcessedMedicalCommandRepository } from '../../domain/ports/IProcessedMedicalCommandRepository';
import { TransactionContext } from '../../domain/ports/IUnitOfWork';
import {
  ProcessedMedicalCommand,
  ProcessedMedicalCommandDocument,
} from '../schemas/processed-medical-command.schema';

@Injectable()
export class ProcessedMedicalCommandMongooseAdapter implements IProcessedMedicalCommandRepository {
  constructor(
    @InjectModel(ProcessedMedicalCommand.name)
    private readonly processedCommandModel: Model<ProcessedMedicalCommandDocument>,
  ) {}

  async tryStart(commandId: string, operation: string, tx?: TransactionContext): Promise<boolean> {
    try {
      const session = this.resolveMongoSession(tx);
      const createResult = session
        ? await this.processedCommandModel.create(
            [
              {
                commandId,
                operation,
                status: 'processing',
                sessionSnapshot: null,
              },
            ],
            { session },
          )
        : await this.processedCommandModel.create({
            commandId,
            operation,
            status: 'processing',
            sessionSnapshot: null,
          });

      return Array.isArray(createResult) ? createResult.length === 1 : Boolean(createResult);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        return false;
      }

      throw error;
    }
  }

  async complete(commandId: string, sessionSnapshot: ConsultorioSession, tx?: TransactionContext): Promise<void> {
    const session = this.resolveMongoSession(tx);
    const update = {
      status: 'completed' as const,
      sessionSnapshot: {
        consultorioId: sessionSnapshot.consultorioId,
        medicoId: sessionSnapshot.medicoId,
        estado: sessionSnapshot.estado,
        pacienteEnAtencion: sessionSnapshot.pacienteEnAtencion,
        noDisponibleDiferido: sessionSnapshot.noDisponibleDiferido,
      },
    };

    if (session) {
      await this.processedCommandModel
        .updateOne(
          { commandId, status: 'processing' },
          update,
          { session },
        )
        .exec();
      return;
    }

    await this.processedCommandModel
      .updateOne(
        { commandId, status: 'processing' },
        update,
      )
      .exec();
  }

  async findCompletedSession(commandId: string, tx?: TransactionContext): Promise<ConsultorioSession | null> {
    const session = this.resolveMongoSession(tx);
    const query = this.processedCommandModel.findOne({ commandId, status: 'completed' });

    if (session) {
      query.session(session);
    }

    const doc = await query.exec();
    if (!doc?.sessionSnapshot) {
      return null;
    }

    return new ConsultorioSession({
      consultorioId: doc.sessionSnapshot.consultorioId,
      medicoId: doc.sessionSnapshot.medicoId,
      estado: doc.sessionSnapshot.estado,
      pacienteEnAtencion: doc.sessionSnapshot.pacienteEnAtencion
        ? {
            nombre: doc.sessionSnapshot.pacienteEnAtencion.nombre,
            documento: doc.sessionSnapshot.pacienteEnAtencion.documento,
          }
        : null,
      noDisponibleDiferido: doc.sessionSnapshot.noDisponibleDiferido,
    });
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
    );
  }

  private resolveMongoSession(tx?: TransactionContext): ClientSession | null {
    if (!tx || tx.kind !== 'mongo' || !tx.value) {
      return null;
    }

    return tx.value as ClientSession;
  }
}