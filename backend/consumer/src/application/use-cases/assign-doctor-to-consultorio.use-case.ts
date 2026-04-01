import { Inject, Injectable } from '@nestjs/common';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { IDoctorRepository } from '../../domain/ports/IDoctorRepository';
import {
  CONSULTORIO_SESSION_REPOSITORY_TOKEN,
  DOCTOR_REPOSITORY_TOKEN,
} from '../../domain/ports/tokens';

export interface AssignDoctorToConsultorioInput {
  doctorId: string;
  consultorioId: string;
}

@Injectable()
export class AssignDoctorToConsultorioUseCase {
  constructor(
    @Inject(DOCTOR_REPOSITORY_TOKEN)
    private readonly doctorRepository: IDoctorRepository,
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
  ) {}

  async execute(input: AssignDoctorToConsultorioInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim() || !input.consultorioId.trim()) {
      throw new ConsultorioDomainError('Doctor y consultorio son requeridos');
    }

    const doctor = await this.doctorRepository.findById(input.doctorId);
    if (!doctor) {
      throw new ConsultorioDomainError('El médico no existe');
    }

    if (!doctor.disponible) {
      throw new ConsultorioDomainError('El médico está no disponible');
    }

    if (doctor.consultorioId) {
      throw new ConsultorioDomainError('El médico ya tiene consultorio asociado');
    }

    const doctorEnConsultorio = await this.doctorRepository.findByConsultorioId(input.consultorioId);
    if (doctorEnConsultorio && doctorEnConsultorio.id !== input.doctorId) {
      throw new ConsultorioDomainError('El consultorio ya está ocupado');
    }

    const currentSession =
      (await this.consultorioSessionRepository.findByConsultorioId(input.consultorioId)) ??
      ConsultorioSession.crearSinMedico(input.consultorioId);

    const updatedSession = currentSession.asignarMedico(input.doctorId);
    const savedSession = await this.consultorioSessionRepository.save(updatedSession);
    await this.doctorRepository.assignConsultorio(input.doctorId, input.consultorioId);

    return savedSession;
  }
}