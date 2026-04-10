import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConsultorioDomainError, ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { buildConsultorioRealtimePayload } from '../../domain/events/consultorio-realtime.event';
import { RecoverableInfraError } from '../errors/message-processing.error';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { IPatientAssignmentTurnoRepository } from '../../domain/ports/IPatientAssignmentTurnoRepository';
import { IProcessedMedicalCommandRepository } from '../../domain/ports/IProcessedMedicalCommandRepository';
import { IUnitOfWork } from '../../domain/ports/IUnitOfWork';
import {
  CONSULTORIO_SESSION_REPOSITORY_TOKEN,
  EVENT_PUBLISHER_TOKEN,
  PATIENT_ASSIGNMENT_TURNO_REPOSITORY_TOKEN,
  PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN,
  UNIT_OF_WORK_TOKEN,
} from '../../domain/ports/tokens';
import { AssignPatientToConsultorioUseCase } from './assign-patient-to-consultorio.use-case';
import { TurnoEventPayload } from '../../domain/entities/turno.entity';

export interface FinalizeMedicalAttentionInput {
  doctorId: string;
  commandId: string;
}

interface FinalizeAttentionResult {
  savedSession: ConsultorioSession;
  attendedTurnoPayload: TurnoEventPayload | null;
  shouldPublishRealtime: boolean;
}

@Injectable()
export class FinalizeMedicalAttentionUseCase {
  private static readonly OPERATION = 'finalizar_atencion_medica';
  private readonly logger = new Logger(FinalizeMedicalAttentionUseCase.name);

  constructor(
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
    @Inject(PATIENT_ASSIGNMENT_TURNO_REPOSITORY_TOKEN)
    private readonly patientAssignmentTurnoRepository: IPatientAssignmentTurnoRepository,
    @Inject(PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN)
    private readonly processedCommandRepository: IProcessedMedicalCommandRepository,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    private readonly assignPatientToConsultorioUseCase: AssignPatientToConsultorioUseCase,
  ) {}

  async execute(input: FinalizeMedicalAttentionInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim() || !input.commandId.trim()) {
      throw new ConsultorioDomainError('Doctor y commandId son requeridos');
    }

    const result = await this.unitOfWork.execute(async tx => {
      const started = await this.processedCommandRepository.tryStart(
        input.commandId,
        FinalizeMedicalAttentionUseCase.OPERATION,
        tx,
      );

      if (!started) {
        const completedSession = await this.processedCommandRepository.findCompletedSession(
          input.commandId,
          tx,
        );

        if (completedSession) {
          return {
            savedSession: completedSession,
            attendedTurnoPayload: null,
            shouldPublishRealtime: false,
          } as FinalizeAttentionResult;
        }

        throw new RecoverableInfraError(
          'El comando ya se encuentra en procesamiento',
          'COMMAND_IN_PROGRESS',
          {
            commandId: input.commandId,
            operation: FinalizeMedicalAttentionUseCase.OPERATION,
          },
        );
      }

      const currentSession = await this.consultorioSessionRepository.findByMedicoId(input.doctorId, tx);
      if (!currentSession) {
        throw new ConsultorioDomainError('El medico no tiene consultorio asociado');
      }

      const activePatientDocument = currentSession.pacienteEnAtencion?.documento ?? null;
      const updatedSession = currentSession.finalizarAtencion();
      const savedSession = await this.consultorioSessionRepository.save(updatedSession, tx);

      let attendedTurnoPayload: TurnoEventPayload | null = null;
      if (activePatientDocument) {
        const attendedTurno = await this.patientAssignmentTurnoRepository.markCalledTurnoAsAttended(
          savedSession.consultorioId,
          activePatientDocument,
          tx,
        );

        if (attendedTurno) {
          attendedTurnoPayload = attendedTurno.toEventPayload();
        } else {
          this.logger.warn(
            `No se encontro turno llamado para cierre de atencion consultorio=${savedSession.consultorioId} paciente=${activePatientDocument}`,
          );
        }
      }

      await this.processedCommandRepository.complete(input.commandId, savedSession, tx);

      return {
        savedSession,
        attendedTurnoPayload,
        shouldPublishRealtime: true,
      } as FinalizeAttentionResult;
    });

    const payload = buildConsultorioRealtimePayload(result.savedSession);

    if (result.shouldPublishRealtime) {
      if (result.attendedTurnoPayload) {
        this.eventPublisher.publish('turno_actualizado', result.attendedTurnoPayload);
      }

      this.eventPublisher.publish('attention_finished', payload);
      this.eventPublisher.publish('consultorio_updated', payload);
    }

    if (result.shouldPublishRealtime && result.savedSession.estado === 'ConMedicoDisponible') {
      try {
        await this.assignPatientToConsultorioUseCase.execute('AttentionFinished');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Fallo de asignación tras finalizar atención: ${message}`);
      }
    }

    return result.savedSession;
  }
}