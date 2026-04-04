import { ConsultorioStateView } from '../views/consultorio-state.view';

export interface IConsultorioStateReader {
  findByConsultorioId(consultorioId: string): Promise<ConsultorioStateView | null>;
}