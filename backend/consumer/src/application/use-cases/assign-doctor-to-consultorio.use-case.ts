import { Inject, Injectable } from '@nestjs/common';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { IDoctorRepository } from '../../domain/ports/IDoctorRepository';
import { IProcessedMedicalCommandRepository } from '../../domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork } from '../../domain/ports/IUnitOfWork';
import {
  CONSULTORIO_SESSION_REPOSITORY_TOKEN,
  DOCTOR_REPOSITORY_TOKEN,
  PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN,
  UNIT_OF_WORK_TOKEN,
} from '../../domain/ports/tokens';

export interface AssignDoctorToConsultorioInput {
  doctorId: string;
  consultorioId: string;
  commandId: string;
}

@Injectable()
export class AssignDoctorToConsultorioUseCase {
  private static readonly OPERATION = 'asociar_medico_consultorio';

  constructor(
    @Inject(DOCTOR_REPOSITORY_TOKEN)
    private readonly doctorRepository: IDoctorRepository,
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
    @Inject(PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN)
    private readonly processedCommandRepository: IProcessedMedicalCommandRepository,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: AssignDoctorToConsultorioInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim() || !input.consultorioId.trim() || !input.commandId.trim()) {
      throw new ConsultorioDomainError('Doctor, consultorio y commandId son requeridos');
    }

    return this.unitOfWork.execute(async tx => {
      const started = await this.processedCommandRepository.tryStart(
        input.commandId,
        AssignDoctorToConsultorioUseCase.OPERATION,
        tx,
      );

      if (!started) {
        const completedSession = await this.processedCommandRepository.findCompletedSession(
          input.commandId,
          tx,
        );

        if (completedSession) {
          return completedSession;
        }

        throw new Error('El comando ya se encuentra en procesamiento');
      }

      const doctor = await this.doctorRepository.findById(input.doctorId, tx);
      if (!doctor) {
        throw new ConsultorioDomainError('El médico no existe');
      }

      if (!doctor.disponible) {
        throw new ConsultorioDomainError('El médico está no disponible');
      }

      if (doctor.consultorioId) {
        throw new ConsultorioDomainError('El médico ya tiene consultorio asociado');
      }

      const doctorEnConsultorio = await this.doctorRepository.findByConsultorioId(input.consultorioId, tx);
      if (doctorEnConsultorio && doctorEnConsultorio.id !== input.doctorId) {
        throw new ConsultorioDomainError('El consultorio ya está ocupado');
      }

      const currentSession =
        (await this.consultorioSessionRepository.findByConsultorioId(input.consultorioId, tx)) ??
        ConsultorioSession.crearSinMedico(input.consultorioId);

      const updatedSession = currentSession.asignarMedico(input.doctorId);
      const savedSession = await this.consultorioSessionRepository.save(updatedSession, tx);
      await this.doctorRepository.assignConsultorio(input.doctorId, input.consultorioId, tx);
      await this.processedCommandRepository.complete(input.commandId, savedSession, tx);

      return savedSession;
    });
  }
}