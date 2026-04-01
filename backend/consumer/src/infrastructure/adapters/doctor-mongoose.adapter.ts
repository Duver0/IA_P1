import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor as DoctorSchema, DoctorDocument } from '../schemas/doctor.schema';
import { DoctorRecord, IDoctorRepository } from '../../domain/ports/IDoctorRepository';

@Injectable()
export class DoctorMongooseAdapter implements IDoctorRepository {
  constructor(
    @InjectModel(DoctorSchema.name)
    private readonly doctorModel: Model<DoctorDocument>,
  ) {}

  async findById(doctorId: string): Promise<DoctorRecord | null> {
    const doc = await this.doctorModel.findById(doctorId).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async findByConsultorioId(consultorioId: string): Promise<DoctorRecord | null> {
    const doc = await this.doctorModel.findOne({ consultorioId }).exec();
    return doc ? this.toRecord(doc) : null;
  }

  async assignConsultorio(doctorId: string, consultorioId: string): Promise<void> {
    // Atomicidad: solo asigna si el medico sigue libre y disponible en el momento del update.
    const result = await this.doctorModel.updateOne(
      { _id: doctorId, consultorioId: null, disponible: true },
      { consultorioId },
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error('No fue posible asignar consultorio de forma atomica');
    }
  }

  async releaseConsultorio(doctorId: string): Promise<void> {
    const result = await this.doctorModel.updateOne(
      { _id: doctorId },
      { consultorioId: null },
    ).exec();

    if (result.matchedCount === 0) {
      throw new Error('Medico no encontrado para liberar consultorio');
    }
  }

  async setDisponibilidad(doctorId: string, disponible: boolean): Promise<void> {
    const result = await this.doctorModel.updateOne(
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
}