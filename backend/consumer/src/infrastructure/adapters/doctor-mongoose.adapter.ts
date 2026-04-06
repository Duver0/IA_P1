import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Doctor as DoctorSchema, DoctorDocument } from '../schemas/doctor.schema';
import { ConsultorioDomainError } from '../../domain/entities/consultorio-session.entity';
import {
  DoctorProvisioningData,
  DoctorProvisioningResult,
  DoctorRecord,
  IDoctorRepository,
} from '../../domain/ports/IDoctorRepository';
import { NonRecoverableInfraError } from '../../application/errors/message-processing.error';
import { TransactionContext } from '../../domain/ports/IUnitOfWork';

@Injectable()
export class DoctorMongooseAdapter implements IDoctorRepository {
  constructor(
    @InjectModel(DoctorSchema.name)
    private readonly doctorModel: Model<DoctorDocument>,
  ) {}

  async findById(doctorId: string, tx?: TransactionContext): Promise<DoctorRecord | null> {
    const query = this.doctorModel.findById(doctorId);
    const session = this.resolveMongoSession(tx);
    if (session) {
      query.session(session);
    }

    const doc = await query.exec();
    return doc ? this.toRecord(doc) : null;
  }

  async findByConsultorioId(consultorioId: string, tx?: TransactionContext): Promise<DoctorRecord | null> {
    const query = this.doctorModel.findOne({ consultorioId });
    const session = this.resolveMongoSession(tx);
    if (session) {
      query.session(session);
    }

    const doc = await query.exec();
    return doc ? this.toRecord(doc) : null;
  }

  async provisionDoctorFromUser(
    data: DoctorProvisioningData,
    tx?: TransactionContext,
  ): Promise<DoctorProvisioningResult> {
    const session = this.resolveMongoSession(tx);

    try {
      const updateResult = session
        ? await this.doctorModel.updateOne(
            { _id: data.userId },
            {
              $setOnInsert: {
                _id: data.userId,
                nombre: data.nombre,
                email: data.email,
                consultorioId: null,
                disponible: true,
              },
            },
            {
              upsert: true,
              setDefaultsOnInsert: true,
              session,
            },
          ).exec()
        : await this.doctorModel.updateOne(
            { _id: data.userId },
            {
              $setOnInsert: {
                _id: data.userId,
                nombre: data.nombre,
                email: data.email,
                consultorioId: null,
                disponible: true,
              },
            },
            {
              upsert: true,
              setDefaultsOnInsert: true,
            },
          ).exec();

      const doctorQuery = this.doctorModel.findById(data.userId);
      if (session) {
        doctorQuery.session(session);
      }

      const doctorDoc = await doctorQuery.exec();
      if (!doctorDoc) {
        throw new NonRecoverableInfraError(
          'No fue posible recuperar el doctor provisionado',
          'DOCTOR_PROVISIONING_LOOKUP_FAILED',
          { userId: data.userId, email: data.email },
        );
      }

      return {
        doctor: this.toRecord(doctorDoc),
        created: Boolean(updateResult.upsertedCount && updateResult.upsertedCount > 0),
      };
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConsultorioDomainError(
          'Ya existe un doctor con ese email',
          'DOCTOR_EMAIL_ALREADY_EXISTS',
        );
      }

      throw error;
    }
  }

  async assignConsultorio(doctorId: string, consultorioId: string, tx?: TransactionContext): Promise<void> {

    const session = this.resolveMongoSession(tx);
    const result = session
      ? await this.doctorModel.updateOne(
          { _id: doctorId, consultorioId: null, disponible: true },
          { consultorioId },
          { session },
        ).exec()
      : await this.doctorModel.updateOne(
          { _id: doctorId, consultorioId: null, disponible: true },
          { consultorioId },
        ).exec();

    if (result.modifiedCount === 0) {
      throw new ConsultorioDomainError(
        'No fue posible asignar consultorio de forma atomica',
        'ATOMIC_ASSIGNMENT_CONFLICT',
      );
    }
  }

  async releaseConsultorio(doctorId: string, tx?: TransactionContext): Promise<void> {
    const session = this.resolveMongoSession(tx);
    const result = session
      ? await this.doctorModel.updateOne(
          { _id: doctorId },
          { consultorioId: null },
          { session },
        ).exec()
      : await this.doctorModel.updateOne(
          { _id: doctorId },
          { consultorioId: null },
        ).exec();

    if (result.matchedCount === 0) {
      throw new ConsultorioDomainError(
        'Medico no encontrado para liberar consultorio',
        'DOCTOR_NOT_FOUND',
      );
    }
  }

  async setDisponibilidad(doctorId: string, disponible: boolean, tx?: TransactionContext): Promise<void> {
    const session = this.resolveMongoSession(tx);
    const result = session
      ? await this.doctorModel.updateOne(
          { _id: doctorId },
          { disponible },
          { session },
        ).exec()
      : await this.doctorModel.updateOne(
          { _id: doctorId },
          { disponible },
        ).exec();

    if (result.matchedCount === 0) {
      throw new ConsultorioDomainError(
        'Medico no encontrado para actualizar disponibilidad',
        'DOCTOR_NOT_FOUND',
      );
    }
  }

  private toRecord(doc: DoctorDocument): DoctorRecord {
    return {
      id: String(doc._id),
      nombre: doc.nombre,
      email: doc.email,
      consultorioId: doc.consultorioId,
      disponible: doc.disponible,
    };
  }

  private resolveMongoSession(tx?: TransactionContext): ClientSession | null {
    if (!tx || tx.kind !== 'mongo' || !tx.value) {
      return null;
    }

    return tx.value as ClientSession;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
    );
  }
}