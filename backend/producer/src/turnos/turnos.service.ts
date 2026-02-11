import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Turno, TurnoDocument } from '../schemas/turno.schema';

@Injectable()
export class TurnosService {
    constructor(@InjectModel(Turno.name) private turnoModel: Model<TurnoDocument>) { }

    // ⚕️ HUMAN CHECK - Consulta de Turno por Cédula
    // Verificar que el campo de búsqueda coincida con el identificador real del paciente
    async findByCedula(cedula: number): Promise<TurnoDocument[]> {
        const turnos = await this.turnoModel
            .find({ cedula: cedula })
            .sort({ createdAt: -1 })
            .exec();

        if (turnos.length === 0) {
            throw new NotFoundException(`No se encontraron turnos para la cédula ${cedula}`);
        }

        return turnos;
    }
}
