import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Turno as TurnoSchema, TurnoDocument } from '../schemas/turno.schema';
import {
    ConsultorioSession,
    ConsultorioSessionDocument,
} from '../schemas/consultorio-session.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { ITurnoRepository } from '../../domain/ports/ITurnoRepository';
import { Turno } from '../../domain/entities/turno.entity';


@Injectable()
export class TurnoMongooseAdapter implements ITurnoRepository {
    constructor(
        @InjectModel(TurnoSchema.name) private readonly turnoModel: Model<TurnoDocument>,
        @InjectModel(ConsultorioSession.name)
        private readonly consultorioSessionModel: Model<ConsultorioSessionDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) {}

    async findAll(): Promise<Turno[]> {
        const docs = await this.turnoModel
            .find()
            .sort({ timestamp: 1 })
            .exec();

        const doctorNameByConsultorio = await this.resolveDoctorNameByConsultorio(docs);
        return docs.map(doc => this.toDomain(doc, doctorNameByConsultorio.get(doc.consultorio ?? '')));
    }

    async findByCedula(cedula: number): Promise<Turno[]> {
        const docs = await this.turnoModel
            .find({ cedula })
            .sort({ createdAt: -1 })
            .exec();

        if (docs.length === 0) {
            throw new NotFoundException(`No se encontraron turnos para la cédula ${cedula}`);
        }

        const doctorNameByConsultorio = await this.resolveDoctorNameByConsultorio(docs);
        return docs.map(doc => this.toDomain(doc, doctorNameByConsultorio.get(doc.consultorio ?? '')));
    }

    async findDoctorNameByConsultorioId(consultorioId: string): Promise<string | null> {
        if (!consultorioId.trim()) {
            return null;
        }

        const consultorioSession = await this.consultorioSessionModel
            .findOne({ consultorioId, medicoId: { $ne: null } })
            .exec();

        if (!consultorioSession?.medicoId) {
            return null;
        }

        const doctor = await this.userModel
            .findOne({ _id: consultorioSession.medicoId, rol: 'medico' })
            .exec();

        return doctor?.nombre ?? null;
    }

    private async resolveDoctorNameByConsultorio(docs: TurnoDocument[]): Promise<Map<string, string>> {
        const consultorioIds = Array.from(
            new Set(
                docs
                    .map(doc => doc.consultorio)
                    .filter(
                        (consultorioId): consultorioId is string =>
                            typeof consultorioId === 'string' && consultorioId.trim().length > 0,
                    ),
            ),
        );

        if (consultorioIds.length === 0) {
            return new Map<string, string>();
        }

        const consultorioSessions = await this.consultorioSessionModel
            .find({ consultorioId: { $in: consultorioIds }, medicoId: { $ne: null } })
            .exec();

        const doctorIds = Array.from(
            new Set(
                consultorioSessions
                    .map(session => session.medicoId)
                    .filter(
                        (medicoId): medicoId is string =>
                            typeof medicoId === 'string' && medicoId.trim().length > 0,
                    ),
            ),
        );

        if (doctorIds.length === 0) {
            return new Map<string, string>();
        }

        const doctors = await this.userModel
            .find({ _id: { $in: doctorIds }, rol: 'medico' })
            .exec();

        const doctorNameById = new Map(
            doctors.map(doctor => [String(doctor._id), doctor.nombre] as const),
        );

        const doctorNameByConsultorio = new Map<string, string>();
        consultorioSessions.forEach(session => {
            if (!session.medicoId) {
                return;
            }

            const doctorName = doctorNameById.get(String(session.medicoId));
            if (doctorName) {
                doctorNameByConsultorio.set(session.consultorioId, doctorName);
            }
        });

        return doctorNameByConsultorio;
    }

    
    private toDomain(doc: TurnoDocument, medicoNombre?: string): Turno {
        return new Turno({
            id: String(doc._id),
            nombre: doc.nombre,
            cedula: doc.cedula,
            consultorio: doc.consultorio,
            ...(medicoNombre ? { medicoNombre } : {}),
            estado: doc.estado,
            priority: doc.priority,
            timestamp: doc.timestamp,
            finAtencionAt: doc.finAtencionAt,
        });
    }
}
