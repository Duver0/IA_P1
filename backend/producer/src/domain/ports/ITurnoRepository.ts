import { Turno } from '../entities/turno.entity';

/**
 * Puerto de dominio: contrato para el repositorio de turnos.
 * El Producer solo necesita operaciones de lectura.
 *
 * ⚕️ HUMAN CHECK - ISP: puerto enfocado solo en lo que el Producer consume
 */
export interface ITurnoRepository {
    findAll(): Promise<Turno[]>;
    findByCedula(cedula: number): Promise<Turno[]>;
    findDoctorNameByConsultorioId(consultorioId: string): Promise<string | null>;
}
