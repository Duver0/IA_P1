import { Turno } from '../entities/turno.entity';


export interface CreateTurnoData {
    cedula: number;
    nombre: string;
    priority?: 'alta' | 'media' | 'baja';
}


export interface ITurnoRepository {
    findActivoPorCedula(cedula: number): Promise<Turno | null>;
    save(data: CreateTurnoData): Promise<Turno>;
    findPacientesEnEspera(): Promise<Turno[]>;
    getConsultoriosOcupados(): Promise<string[]>;
    asignarConsultorio(turnoId: string, consultorio: string): Promise<Turno | null>;
    finalizarTurnosLlamados(): Promise<Turno[]>;
}
