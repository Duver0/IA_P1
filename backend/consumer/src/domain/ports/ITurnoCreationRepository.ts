import { Turno } from '../entities/turno.entity';
import { CreateTurnoData } from './ITurnoRepository';

export interface ITurnoCreationRepository {
  findActivoPorCedula(cedula: number): Promise<Turno | null>;
  save(data: CreateTurnoData): Promise<Turno>;
}