import { Turno } from '../entities/turno.entity';
import { TransactionContext } from './IUnitOfWork';

export interface IPatientAssignmentTurnoRepository {
  assignNextWaitingPatientToConsultorio(
    consultorioId: string,
    tx?: TransactionContext,
  ): Promise<Turno | null>;

  markCalledTurnoAsAttended(
    consultorioId: string,
    pacienteDocumento: string,
    tx?: TransactionContext,
  ): Promise<Turno | null>;
}
