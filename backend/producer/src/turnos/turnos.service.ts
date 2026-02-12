import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Turno, TurnoDocument } from '../schemas/turno.schema';
import { TurnoEventPayload } from '../types/turno-event';

@Injectable()
export class TurnosService {
    constructor(@InjectModel(Turno.name) private readonly turnoModel: Model<TurnoDocument>) { }

    // ⚕️ HUMAN CHECK - Obtener todos los turnos
    // Ordenados por timestamp ascendente (más antiguos primero)
    async findAll(): Promise<TurnoDocument[]> {
        return this.turnoModel
            .find()
            .sort({ timestamp: 1 })
            .exec();
    }

    // ⚕️ HUMAN CHECK - Consulta de Turno por Cédula
    // Verificar que el campo de búsqueda coincida con el identificador real del paciente
    async findByCedula(cedula: number): Promise<TurnoDocument[]> {
        const turnos = await this.turnoModel
            .find({ cedula })
            .sort({ createdAt: -1 })
            .exec();

        if (turnos.length === 0) {
            throw new NotFoundException(`No se encontraron turnos para la cédula ${cedula}`);
        }

        return turnos;
    }

    /**
     * Mapea un TurnoDocument a TurnoEventPayload para emitir por WebSocket
     */
    toEventPayload(turno: TurnoDocument): TurnoEventPayload {
        return {
            id: String(turno._id),
            nombre: turno.nombre,
            cedula: turno.cedula,
            consultorio: turno.consultorio,
            estado: turno.estado,
            priority: turno.priority,
            timestamp: turno.timestamp,
        };
    }
}
