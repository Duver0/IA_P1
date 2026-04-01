import { Inject, Injectable } from '@nestjs/common';
import { ConsultorioDomainError, ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { IDoctorRepository } from '../../domain/ports/IDoctorRepository';
import {
  CONSULTORIO_SESSION_REPOSITORY_TOKEN,
  DOCTOR_REPOSITORY_TOKEN,
} from '../../domain/ports/tokens';

export interface SetDoctorAvailabilityInput {
  doctorId: string;
  disponible: boolean;
}

@Injectable()
export class SetDoctorAvailabilityUseCase {
  constructor(
    @Inject(DOCTOR_REPOSITORY_TOKEN)
    private readonly doctorRepository: IDoctorRepository,
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
  ) {}

  async execute(input: SetDoctorAvailabilityInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim()) {
      throw new ConsultorioDomainError('Doctor requerido');
    }

    const currentSession = await this.consultorioSessionRepository.findByMedicoId(input.doctorId);
    if (!currentSession) {
      throw new ConsultorioDomainError('El medico no tiene consultorio asociado');
    }

    const updatedSession = input.disponible
      ? currentSession.marcarDisponible()
      : currentSession.marcarNoDisponible();

    const savedSession = await this.consultorioSessionRepository.save(updatedSession);
    await this.doctorRepository.setDisponibilidad(input.doctorId, input.disponible);

    return savedSession;
  }
}