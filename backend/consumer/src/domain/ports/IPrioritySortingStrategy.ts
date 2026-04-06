import { Turno } from '../entities/turno.entity';


export interface IPrioritySortingStrategy {
    sort(turnos: Turno[]): Turno[];
}
