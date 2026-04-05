import { ConsultorioSession } from '../entities/consultorio-session.entity';
import { TransactionContext } from './IUnitOfWork';

export interface IConsultorioAvailabilityRepository {
  findNextAvailable(tx?: TransactionContext): Promise<ConsultorioSession | null>;
  reserveIfAvailable(consultorioId: string, tx?: TransactionContext): Promise<ConsultorioSession | null>;
}
