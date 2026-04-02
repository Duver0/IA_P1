import { ConsultorioSession } from '../entities/consultorio-session.entity';
import { TransactionContext } from './IUnitOfWork';

export interface IProcessedMedicalCommandRepository {
  tryStart(commandId: string, operation: string, tx?: TransactionContext): Promise<boolean>;
  complete(commandId: string, session: ConsultorioSession, tx?: TransactionContext): Promise<void>;
  findCompletedSession(commandId: string, tx?: TransactionContext): Promise<ConsultorioSession | null>;
}