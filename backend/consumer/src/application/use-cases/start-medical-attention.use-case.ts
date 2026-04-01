import { Inject, Injectable } from '@nestjs/common';
import { ConsultorioDomainError, ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { CONSULTORIO_SESSION_REPOSITORY_TOKEN } from '../../domain/ports/tokens';

export interface StartMedicalAttentionInput {
  doctorId: string;
  pacienteNombre: string;
  pacienteDocumento: string;
}

@Injectable()
export class StartMedicalAttentionUseCase {
  constructor(
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
  ) {}

  async execute(input: StartMedicalAttentionInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim()) {
      throw new ConsultorioDomainError('Doctor requerido');
    }

    const currentSession = await this.consultorioSessionRepository.findByMedicoId(input.doctorId);
    if (!currentSession) {
      throw new ConsultorioDomainError('El medico no tiene consultorio asociado');
    }

    const updatedSession = currentSession.iniciarAtencion({
      nombre: input.pacienteNombre,
      documento: input.pacienteDocumento,
    });

    return this.consultorioSessionRepository.save(updatedSession);
  }
}