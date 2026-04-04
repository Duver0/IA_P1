import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConsultorioDomainError, ConsultorioSession } from '../../domain/entities/consultorio-session.entity';
import { buildConsultorioRealtimePayload } from '../../domain/events/consultorio-realtime.event';
import { IConsultorioSessionRepository } from '../../domain/ports/IConsultorioSessionRepository';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { IPatientAssignmentTurnoRepository } from '../../domain/ports/IPatientAssignmentTurnoRepository';
import {
  CONSULTORIO_SESSION_REPOSITORY_TOKEN,
  EVENT_PUBLISHER_TOKEN,
  PATIENT_ASSIGNMENT_TURNO_REPOSITORY_TOKEN,
} from '../../domain/ports/tokens';
import { AssignPatientToConsultorioUseCase } from './assign-patient-to-consultorio.use-case';

export interface FinalizeMedicalAttentionInput {
  doctorId: string;
}

@Injectable()
export class FinalizeMedicalAttentionUseCase {
  private readonly logger = new Logger(FinalizeMedicalAttentionUseCase.name);

  constructor(
    @Inject(CONSULTORIO_SESSION_REPOSITORY_TOKEN)
    private readonly consultorioSessionRepository: IConsultorioSessionRepository,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
    @Inject(PATIENT_ASSIGNMENT_TURNO_REPOSITORY_TOKEN)
    private readonly patientAssignmentTurnoRepository: IPatientAssignmentTurnoRepository,
    private readonly assignPatientToConsultorioUseCase: AssignPatientToConsultorioUseCase,
  ) {}

  async execute(input: FinalizeMedicalAttentionInput): Promise<ConsultorioSession> {
    if (!input.doctorId.trim()) {
      throw new ConsultorioDomainError('Doctor requerido');
    }

    const currentSession = await this.consultorioSessionRepository.findByMedicoId(input.doctorId);
    if (!currentSession) {
      throw new ConsultorioDomainError('El medico no tiene consultorio asociado');
    }

    const activePatientDocument = currentSession.pacienteEnAtencion?.documento ?? null;

    const updatedSession = currentSession.finalizarAtencion();
    const savedSession = await this.consultorioSessionRepository.save(updatedSession);
    const payload = buildConsultorioRealtimePayload(savedSession);

    if (activePatientDocument) {
      const attendedTurno = await this.patientAssignmentTurnoRepository.markCalledTurnoAsAttended(
        savedSession.consultorioId,
        activePatientDocument,
      );

      if (attendedTurno) {
        this.eventPublisher.publish('turno_actualizado', attendedTurno.toEventPayload());
      } else {
        this.logger.warn(
          `No se encontro turno llamado para cierre de atencion consultorio=${savedSession.consultorioId} paciente=${activePatientDocument}`,
        );
      }
    }

    this.eventPublisher.publish('attention_finished', payload);
    this.eventPublisher.publish('consultorio_updated', payload);

    if (savedSession.estado === 'ConMedicoDisponible') {
      try {
        await this.assignPatientToConsultorioUseCase.execute('AttentionFinished');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Fallo de asignación tras finalizar atención: ${message}`);
      }
    }

    return savedSession;
  }
}