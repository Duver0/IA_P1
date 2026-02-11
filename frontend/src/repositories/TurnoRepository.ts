import { Turno } from "@/domain/Turno";
import { CrearTurnoDTO, CrearTurnoResponse } from "@/domain/CrearTurno";


export interface TurnoRepository {
    obtenerTurnos(): Promise<Turno[]>;
    crearTurno(data: CrearTurnoDTO): Promise<CrearTurnoResponse>;
}


