import { Inject, Injectable } from '@nestjs/common';
import { ConsultorioDomainError, ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { buildConsultorioRealtimePayload } from '../../domain/events/consultorio-realtime.event';
import { RecoverableInfraError } from '../errors/message-processing.error';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { IProcessedMedicalCommandRepository } from '../../domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork } from '../../domain/ports/IUnitOfWork';
import {
  CONSULTORIO_SESSION_REPOSITORY_TOKEN,
  EVENT_PUBLISHER_TOKEN,
  PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN,
  UNIT_OF_WORK_TOKEN,
} from '../../domain/ports/tokens';

export interface StartMedicalAttentionInput {
  doctorId: string;
  pacienteNombre: string;
  pacienteDocumento: string;
  commandId: string;
}

@Injectable()
export class StartMedicalAttentionUseCase {
  private static readonly OPERATION = 'iniciar_atencion_medica';

  constructor(
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
    @Inject(PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN)
    private readonly processedCommandRepository: IProcessedMedicalCommandRepository,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(input: StartMedicalAttentionInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim() || !input.commandId.trim()) {
      throw new ConsultorioDomainError('Doctor y commandId son requeridos');
    }

    let shouldEmitRealtime = false;

    const savedSession = await this.unitOfWork.execute(async tx => {
      const started = await this.processedCommandRepository.tryStart(
        input.commandId,
        StartMedicalAttentionUseCase.OPERATION,
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
            operation: StartMedicalAttentionUseCase.OPERATION,
          },
        );
      }

      const currentSession = await this.consultorioSessionRepository.findByMedicoId(input.doctorId, tx);
      if (!currentSession) {
        throw new ConsultorioDomainError('El medico no tiene consultorio asociado');
      }

      const updatedSession = currentSession.iniciarAtencion({
        nombre: input.pacienteNombre,
        documento: input.pacienteDocumento,
      });

      const savedSession = await this.consultorioSessionRepository.save(updatedSession, tx);
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