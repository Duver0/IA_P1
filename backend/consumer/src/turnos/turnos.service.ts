import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Turno, TurnoDocument } from '../schemas/turno.schema';
import { CreateTurnoDto } from '../dto/create-turno.dto';

@Injectable()
export class TurnosService {
    constructor(@InjectModel(Turno.name) private turnoModel: Model<TurnoDocument>) { }

    // ⚕️ HUMAN CHECK - Lógica de Asignación de Consultorio
    // Reemplazar la asignación aleatoria por lógica real de negocio
    async crearTurno(data: CreateTurnoDto): Promise<TurnoDocument> {
        const consultorio = Math.floor(Math.random() * 10) + 1;

        const turno = new this.turnoModel({
            cedula: data.cedula,
            nombre: data.nombre,
            consultorio,
            estado: 'asignado',
        });

        return turno.save();
    }
}
