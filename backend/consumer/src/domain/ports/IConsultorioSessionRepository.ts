import { ConsultorioSession } from '../entities/consultorio-session.entity';
import { TransactionContext } from './IUnitOfWork';

export interface IConsultorioSessionRepository {
  findByConsultorioId(consultorioId: string, tx?: TransactionContext): Promise<ConsultorioSession | null>;
  findByMedicoId(medicoId: string, tx?: TransactionContext): Promise<ConsultorioSession | null>;
  save(session: ConsultorioSession, tx?: TransactionContext): Promise<ConsultorioSession>;
}