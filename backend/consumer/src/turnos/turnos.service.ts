import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Turno, TurnoDocument } from '../schemas/turno.schema';
import { CreateTurnoDto } from '../dto/create-turno.dto';
import { TurnoEventPayload, TurnoPriority } from '../types/turno-event';

// ⚕️ HUMAN CHECK - Orden de prioridades para el scheduler
// El valor numérico determina el orden de asignación (menor = mayor prioridad)
const PRIORITY_ORDER: Record<TurnoPriority, number> = {
    alta: 0,
    media: 1,
    baja: 2,
};

@Injectable()
export class TurnosService {
    private readonly logger = new Logger(TurnosService.name);

    constructor(@InjectModel(Turno.name) private readonly turnoModel: Model<TurnoDocument>) { }

    // ⚕️ HUMAN CHECK - Lógica de Creación de Turno
    // El turno se crea en estado 'espera' SIN consultorio.
    // El scheduler se encarga de asignar consultorio cada 15 segundos.
    async crearTurno(data: CreateTurnoDto): Promise<TurnoDocument> {
        const turno = new this.turnoModel({
            cedula: data.cedula,
            nombre: data.nombre,
            consultorio: null,
            estado: 'espera',
            priority: data.priority ?? 'media',
            timestamp: Date.now(),
        });

        const saved = await turno.save();
        this.logger.log(`Turno creado en espera para paciente ${saved.cedula} — ID: ${saved._id}`);
        return saved;
    }

    // ⚕️ HUMAN CHECK - Consulta de pacientes en espera
    // Ordenados por prioridad (alta > media > baja) y luego por timestamp (más antiguo primero)
    // Se usa sort en memoria porque MongoDB no soporta sort por enum personalizado
    async findPacientesEnEspera(): Promise<TurnoDocument[]> {
        const turnos = await this.turnoModel
            .find({ estado: 'espera' })
            .exec();

        // ⚕️ HUMAN CHECK - Sort único en memoria (eliminada doble ordenación redundante)
        // Antes se hacía .sort({timestamp:1}) en DB + .sort() en memoria
        turnos.sort((a, b) => {
            const pA = PRIORITY_ORDER[a.priority] ?? PRIORITY_ORDER.media;
            const pB = PRIORITY_ORDER[b.priority] ?? PRIORITY_ORDER.media;
            if (pA !== pB) return pA - pB;
            return a.timestamp - b.timestamp;
        });

        return turnos;
    }

    // ⚕️ HUMAN CHECK - Consultorios ocupados
    // Un consultorio está ocupado si hay un turno en estado 'llamado' asignado a él
    async getConsultoriosOcupados(): Promise<string[]> {
        const turnos = await this.turnoModel
            .find({ estado: 'llamado', consultorio: { $ne: null } })
            .select('consultorio')
            .lean()
            .exec();

        return turnos
            .map(t => t.consultorio)
            .filter((c): c is string => c !== null && c !== undefined);
    }

    // ⚕️ HUMAN CHECK - Asignación atómica de consultorio
    // Usa filtro por estado 'espera' para evitar race condition:
    // si dos ticks del scheduler intentan asignar el mismo turno,
    // solo el primero tendrá éxito (el segundo no encontrará estado='espera')
    async asignarConsultorio(turnoId: string, consultorio: string): Promise<TurnoDocument | null> {
        // ⚕️ HUMAN CHECK - Duración aleatoria
        // Calculamos un tiempo aleatorio entre 8 y 15 segundos
        const duracionSegundos = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
        const finAtencionAt = Date.now() + duracionSegundos * 1000;

        const turno = await this.turnoModel.findOneAndUpdate(
            { _id: turnoId, estado: 'espera' },
            {
                consultorio,
                estado: 'llamado',
                finAtencionAt
            },
            { new: true },
        ).exec();

        if (turno) {
            this.logger.log(`Turno ${turnoId} asignado al consultorio ${consultorio} (duración: ${duracionSegundos}s)`);
        }

        return turno;
    }

    // ⚕️ HUMAN CHECK - Transición automática a 'atendido' por tiempo
    // Busca los turnos que están en estado 'llamado' Y cuyo tiempo de atención ya venció.
    async finalizarTurnosLlamados(): Promise<TurnoDocument[]> {
        const ahora = Date.now();
        const expirados = await this.turnoModel.find({
            estado: 'llamado',
            finAtencionAt: { $lte: ahora }
        }).exec();

        if (expirados.length === 0) return [];

        await this.turnoModel.updateMany(
            {
                estado: 'llamado',
                finAtencionAt: { $lte: ahora }
            },
            { estado: 'atendido' },
        ).exec();

        this.logger.log(`Finalizados ${expirados.length} turnos cuyo tiempo de atención expiró`);

        // Retornamos los documentos actualizados (virtualmente) para emitir eventos
        return expirados.map(t => {
            t.estado = 'atendido';
            return t;
        });
    }

    /**
     * Mapea un TurnoDocument a TurnoEventPayload para emitir por RabbitMQ/WebSocket
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
            finAtencionAt: turno.finAtencionAt ?? undefined,
        };
    }
}
