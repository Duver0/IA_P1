import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Turno as TurnoSchema, TurnoDocument } from '../schemas/turno.schema';
import { ITurnoRepository, CreateTurnoData } from '../../domain/ports/ITurnoRepository';
import { Turno } from '../../domain/entities/turno.entity';
import { IPrioritySortingStrategy } from '../../domain/ports/IPrioritySortingStrategy';
import { PRIORITY_SORTING_STRATEGY_TOKEN } from '../../domain/ports/tokens';
import { TransactionContext } from '../../domain/ports/IUnitOfWork';
import { IPatientAssignmentTurnoRepository } from '../../domain/ports/IPatientAssignmentTurnoRepository';


@Injectable()
export class TurnoMongooseAdapter implements ITurnoRepository, IPatientAssignmentTurnoRepository {
    private readonly logger = new Logger(TurnoMongooseAdapter.name);

    constructor(
        @InjectModel(TurnoSchema.name) private readonly turnoModel: Model<TurnoDocument>,
        @Inject(PRIORITY_SORTING_STRATEGY_TOKEN) private readonly prioritySorting: IPrioritySortingStrategy,
    ) {}

    async findActivoPorCedula(cedula: number): Promise<Turno | null> {
        const doc = await this.turnoModel
            .findOne({ cedula, estado: { $in: ['espera', 'llamado'] } })
            .exec();

        return doc ? this.toDomain(doc) : null;
    }

    async save(data: CreateTurnoData): Promise<Turno> {
        const doc = new this.turnoModel({
            cedula: data.cedula,
            nombre: data.nombre,
            consultorio: null,
            estado: 'espera',
            priority: data.priority ?? 'media',
            timestamp: Date.now(),
        });

        const saved = await doc.save();
        this.logger.log(`Turno creado en espera para paciente ${saved.cedula} — ID: ${saved._id}`);
        return this.toDomain(saved);
    }

    async findPacientesEnEspera(): Promise<Turno[]> {
        const docs = await this.turnoModel
            .find({ estado: 'espera' })
            .exec();

        const turnos = docs.map(doc => this.toDomain(doc));


        return this.prioritySorting.sort(turnos);
    }

    async getConsultoriosOcupados(): Promise<string[]> {
        const docs = await this.turnoModel
            .find({ estado: 'llamado', consultorio: { $ne: null } })
            .select('consultorio')
            .lean()
            .exec();

        return docs
            .map(t => t.consultorio)
            .filter((c): c is string => c !== null && c !== undefined);
    }



    async asignarConsultorio(turnoId: string, consultorio: string): Promise<Turno | null> {
        const duracionSegundos = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
        const finAtencionAt = Date.now() + duracionSegundos * 1000;

        const doc = await this.turnoModel.findOneAndUpdate(
            { _id: turnoId, estado: 'espera' },
            {
                consultorio,
                estado: 'llamado',
                finAtencionAt,
            },
            { new: true },
        ).exec();

        if (doc) {
            this.logger.log(`Turno ${turnoId} asignado al consultorio ${consultorio} (duración: ${duracionSegundos}s)`);
            return this.toDomain(doc);
        }

        return null;
    }

    async assignNextWaitingPatientToConsultorio(
        consultorioId: string,
        tx?: TransactionContext,
    ): Promise<Turno | null> {
        const session = this.resolveMongoSession(tx);

        const calledTurnoQuery = this.turnoModel.exists({
            estado: 'llamado',
            consultorio: consultorioId,
        });
        if (session) {
            calledTurnoQuery.session(session);
        }

        const hasCalledTurno = await calledTurnoQuery.exec();
        if (hasCalledTurno) {
            return null;
        }

        const options = {
            new: true,
            sort: {
                timestamp: 1,
                _id: 1,
            },
            ...(session ? { session } : {}),
        };

        const doc = await this.turnoModel.findOneAndUpdate(
            { estado: 'espera' },
            {
                consultorio: consultorioId,
                estado: 'llamado',
                finAtencionAt: null,
            },
            options,
        ).exec();

        return doc ? this.toDomain(doc) : null;
    }

    async markCalledTurnoAsAttended(
        consultorioId: string,
        pacienteDocumento: string,
        tx?: TransactionContext,
    ): Promise<Turno | null> {
        const cedula = Number(pacienteDocumento);
        if (!Number.isFinite(cedula)) {
            return null;
        }

        const session = this.resolveMongoSession(tx);
        const options = {
            new: true,
            sort: {
                timestamp: 1,
                _id: 1,
            },
            ...(session ? { session } : {}),
        };

        const doc = await this.turnoModel.findOneAndUpdate(
            {
                estado: 'llamado',
                consultorio: consultorioId,
                cedula,
            },
            {
                estado: 'atendido',
            },
            options,
        ).exec();

        return doc ? this.toDomain(doc) : null;
    }


    async finalizarTurnosLlamados(): Promise<Turno[]> {
        const ahora = Date.now();
        const expirados = await this.turnoModel.find({
            estado: 'llamado',
            finAtencionAt: { $lte: ahora },
        }).exec();

        if (expirados.length === 0) return [];

        await this.turnoModel.updateMany(
            {
                estado: 'llamado',
                finAtencionAt: { $lte: ahora },
            },
            { estado: 'atendido' },
        ).exec();

        this.logger.log(`Finalizados ${expirados.length} turnos cuyo tiempo de atención expiró`);


        return expirados.map(doc => {
            doc.estado = 'atendido';
            return this.toDomain(doc);
        });
    }

    
    private toDomain(doc: TurnoDocument): Turno {
        return new Turno({
            id: String(doc._id),
            nombre: doc.nombre,
            cedula: doc.cedula,
            consultorio: doc.consultorio,
            estado: doc.estado,
            priority: doc.priority,
            timestamp: doc.timestamp,
            finAtencionAt: doc.finAtencionAt,
        });
    }

    private resolveMongoSession(tx?: TransactionContext): ClientSession | null {
        if (!tx || tx.kind !== 'mongo' || !tx.value) {
            return null;
        }

        return tx.value as ClientSession;
    }
}
