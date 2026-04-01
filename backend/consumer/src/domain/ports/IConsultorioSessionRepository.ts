import { ConsultorioSession } from '../entities/consultorio-session.entity';

export interface IConsultorioSessionRepository {
  findByConsultorioId(consultorioId: string): Promise<ConsultorioSession | null>;
  findByMedicoId(medicoId: string): Promise<ConsultorioSession | null>;
  save(session: ConsultorioSession): Promise<ConsultorioSession>;
}