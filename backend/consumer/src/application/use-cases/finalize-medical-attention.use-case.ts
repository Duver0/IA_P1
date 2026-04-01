import { Inject, Injectable } from '@nestjs/common';
import { ConsultorioDomainError, ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { CONSULTORIO_SESSION_REPOSITORY_TOKEN } from '../../domain/ports/tokens';

export interface FinalizeMedicalAttentionInput {
  doctorId: string;
}

@Injectable()
export class FinalizeMedicalAttentionUseCase {
  constructor(
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
  ) {}

  async execute(input: FinalizeMedicalAttentionInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim()) {
      throw new ConsultorioDomainError('Doctor requerido');
    }

    const currentSession = await this.consultorioSessionRepository.findByMedicoId(input.doctorId);
    if (!currentSession) {
      throw new ConsultorioDomainError('El medico no tiene consultorio asociado');
    }

    const updatedSession = currentSession.finalizarAtencion();
    return this.consultorioSessionRepository.save(updatedSession);
  }
}