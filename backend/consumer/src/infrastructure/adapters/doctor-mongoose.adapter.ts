import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Doctor as DoctorSchema, DoctorDocument } from '../schemas/doctor.schema';
import { DoctorRecord, IDoctorRepository } from '../../domain/ports/IDoctorRepository';
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

  async assignConsultorio(doctorId: string, consultorioId: string, tx?: TransactionContext): Promise<void> {
    // Atomicidad: solo asigna si el medico sigue libre y disponible en el momento del update.
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
      throw new Error('No fue posible asignar consultorio de forma atomica');
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
      throw new Error('Medico no encontrado para liberar consultorio');
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
      throw new Error('Medico no encontrado para actualizar disponibilidad');
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
}