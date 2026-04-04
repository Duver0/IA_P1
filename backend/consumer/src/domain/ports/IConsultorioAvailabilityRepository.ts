import { ConsultorioSession, PacienteEnAtencion } from '../entities/consultorio-session.entity';
import { TransactionContext } from './IUnitOfWork';

export interface IConsultorioAvailabilityRepository {
  findNextAvailable(tx?: TransactionContext): Promise<ConsultorioSession | null>;
  startAttentionIfAvailable(
    consultorioId: string,
    paciente: PacienteEnAtencion,
    tx?: TransactionContext,
  ): Promise<ConsultorioSession | null>;
}
