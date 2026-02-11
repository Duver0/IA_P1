import { Turno } from "./domain/Turno";

export interface TurnoRepository {
    obtenerTurnos(): Promise<Turno[]>;
}
