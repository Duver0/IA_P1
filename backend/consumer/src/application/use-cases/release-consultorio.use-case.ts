import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConsultorioDomainError, ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { buildConsultorioRealtimePayload } from '../../domain/events/consultorio-realtime.event';
import { RecoverableInfraError } from '../errors/message-processing.error';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { IDoctorRepository } from '../../domain/ports/IDoctorRepository';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { IProcessedMedicalCommandRepository } from '../../domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork } from '../../domain/ports/IUnitOfWork';
import {
  CONSULTORIO_SESSION_REPOSITORY_TOKEN,
  DOCTOR_REPOSITORY_TOKEN,
  EVENT_PUBLISHER_TOKEN,
  PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN,
  UNIT_OF_WORK_TOKEN,
} from '../../domain/ports/tokens';

export interface ReleaseConsultorioInput {
  doctorId: string;
  commandId: string;
}

@Injectable()
export class ReleaseConsultorioUseCase {
  private static readonly OPERATION = 'liberar_consultorio';
  private readonly logger = new Logger(ReleaseConsultorioUseCase.name);

  constructor(
    @Inject(DOCTOR_REPOSITORY_TOKEN)
    private readonly doctorRepository: IDoctorRepository,
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
    @Inject(PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN)
    private readonly processedCommandRepository: IProcessedMedicalCommandRepository,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(input: ReleaseConsultorioInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim() || !input.commandId.trim()) {
      throw new ConsultorioDomainError('Doctor y commandId son requeridos');
    }

    let shouldEmitRealtime = false;

    const savedSession = await this.unitOfWork.execute(async tx => {
      const started = await this.processedCommandRepository.tryStart(
        input.commandId,
        ReleaseConsultorioUseCase.OPERATION,
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

        throw new RecoverableInfraError(
          'El comando ya se encuentra en procesamiento',
          'COMMAND_IN_PROGRESS',
          {
            commandId: input.commandId,
            operation: ReleaseConsultorioUseCase.OPERATION,
          },
        );
      }

      const currentSession = await this.consultorioSessionRepository.findByMedicoId(input.doctorId, tx);
      if (!currentSession) {
        throw new ConsultorioDomainError('El medico no tiene consultorio asociado');
      }

      const releasedSession = currentSession.abandonarConsultorio();
      const savedSession = await this.consultorioSessionRepository.save(releasedSession, tx);

      const doctor = await this.doctorRepository.findById(input.doctorId, tx);
      if (doctor) {
        await this.doctorRepository.releaseConsultorio(input.doctorId, tx);
        await this.doctorRepository.setDisponibilidad(input.doctorId, true, tx);
      } else {
        this.logger.warn(
          `Se libero sesion de consultorio sin sincronizar doctor (doctorId=${input.doctorId})`,
        );
      }

      await this.processedCommandRepository.complete(input.commandId, savedSession, tx);
      shouldEmitRealtime = true;

      return savedSession;
    });

    if (shouldEmitRealtime) {
      this.eventPublisher.publish('consultorio_updated', buildConsultorioRealtimePayload(savedSession));
    }

    return savedSession;
  }
}