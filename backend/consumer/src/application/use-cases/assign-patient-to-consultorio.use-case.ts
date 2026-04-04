import { Inject, Injectable, Logger } from '@nestjs/common';
import { Turno } from '../../domain/entities/turno.entity';
import { ConsultorioEstado } from '../../domain/entities/consultorio-session.entity';
import { ConsultorioRealtimeEventPayload } from '../../domain/events/consultorio-realtime.event';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { IUnitOfWork } from '../../domain/ports/IUnitOfWork';
import { IConsultorioAvailabilityRepository } from '../../domain/ports/IConsultorioAvailabilityRepository';
import { IPatientAssignmentTurnoRepository } from '../../domain/ports/IPatientAssignmentTurnoRepository';
import {
  CONSULTORIO_AVAILABILITY_REPOSITORY_TOKEN,
  EVENT_PUBLISHER_TOKEN,
  PATIENT_ASSIGNMENT_TURNO_REPOSITORY_TOKEN,
  UNIT_OF_WORK_TOKEN,
} from '../../domain/ports/tokens';
import { RecoverableInfraError } from '../errors/message-processing.error';

export type AssignPatientTrigger =
  | 'PatientCreated'
  | 'DoctorBecameAvailable'
  | 'AttentionFinished'
  | 'Unknown';

export type AssignPatientNoopReason =
  | 'NO_WAITING_PATIENTS'
  | 'NO_CONSULTORIOS_AVAILABLE'
  | 'CONCURRENCY_CONFLICT';

export interface AssignPatientToConsultorioResult {
  status: 'assigned' | 'noop';
  trigger: AssignPatientTrigger;
  reason?: AssignPatientNoopReason;
  turno?: Turno;
  consultorioId?: string;
}

interface AssignmentTransactionResult {
  status: 'assigned' | 'noop';
  reason?: AssignPatientNoopReason;
  turno?: Turno;
  consultorioId?: string;
  medicoId?: string | null;
  estado?: ConsultorioEstado;
}

@Injectable()
export class AssignPatientToConsultorioUseCase {
  private readonly logger = new Logger(AssignPatientToConsultorioUseCase.name);

  constructor(
    @Inject(PATIENT_ASSIGNMENT_TURNO_REPOSITORY_TOKEN)
    private readonly patientAssignmentTurnoRepository: IPatientAssignmentTurnoRepository,
    @Inject(CONSULTORIO_AVAILABILITY_REPOSITORY_TOKEN)
    private readonly consultorioAvailabilityRepository: IConsultorioAvailabilityRepository,
    @Inject(UNIT_OF_WORK_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(trigger: AssignPatientTrigger = 'Unknown'): Promise<AssignPatientToConsultorioResult> {
    try {
      const transactionResult = await this.unitOfWork.execute(async tx => {
        const consultorio = await this.consultorioAvailabilityRepository.findNextAvailable(tx);
        if (!consultorio) {
          return {
            status: 'noop',
            reason: 'NO_CONSULTORIOS_AVAILABLE',
          } as AssignmentTransactionResult;
        }

        const turno =
          await this.patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio(
            consultorio.consultorioId,
            tx,
          );

        if (!turno) {
          return {
            status: 'noop',
            reason: 'NO_WAITING_PATIENTS',
            consultorioId: consultorio.consultorioId,
          } as AssignmentTransactionResult;
        }

        const updatedConsultorio =
          await this.consultorioAvailabilityRepository.startAttentionIfAvailable(
            consultorio.consultorioId,
            {
              nombre: turno.nombre,
              documento: String(turno.cedula),
            },
            tx,
          );

        if (!updatedConsultorio) {
          throw new RecoverableInfraError(
            'Conflicto de concurrencia al reservar consultorio disponible',
            'PATIENT_ASSIGNMENT_CONCURRENCY_CONFLICT',
            {
              consultorioId: consultorio.consultorioId,
              turnoId: turno.id,
            },
          );
        }

        return {
          status: 'assigned',
          turno,
          consultorioId: updatedConsultorio.consultorioId,
          medicoId: updatedConsultorio.medicoId,
          estado: updatedConsultorio.estado,
        } as AssignmentTransactionResult;
      });

      if (transactionResult.status === 'assigned' && transactionResult.turno) {
        const consultorioRealtimePayload: ConsultorioRealtimeEventPayload = {
          consultorioId: transactionResult.consultorioId ?? 'N/A',
          medicoId: transactionResult.medicoId ?? null,
          estado: transactionResult.estado ?? 'EnAtencion',
          patientId: String(transactionResult.turno.cedula),
          timestamp: Date.now(),
        };

        this.eventPublisher.publish('turno_actualizado', transactionResult.turno.toEventPayload());
        this.eventPublisher.publish('patient_assigned', consultorioRealtimePayload);
        this.eventPublisher.publish('consultorio_updated', consultorioRealtimePayload);
        this.logger.log(
          `assignment_success trigger=${trigger} consultorio=${transactionResult.consultorioId} turno=${transactionResult.turno.id}`,
        );

        return {
          status: 'assigned',
          trigger,
          turno: transactionResult.turno,
          consultorioId: transactionResult.consultorioId,
        };
      }

      if (transactionResult.reason === 'NO_WAITING_PATIENTS') {
        this.logger.log(
          `assignment_noop_no_patients trigger=${trigger} consultorio=${transactionResult.consultorioId ?? 'N/A'}`,
        );
      } else {
        this.logger.log(`assignment_noop_no_consultorios trigger=${trigger}`);
      }

      return {
        status: 'noop',
        trigger,
        reason: transactionResult.reason,
        consultorioId: transactionResult.consultorioId,
      };
    } catch (error: unknown) {
      if (
        error instanceof RecoverableInfraError &&
        error.code === 'PATIENT_ASSIGNMENT_CONCURRENCY_CONFLICT'
      ) {
        this.logger.warn(`assignment_noop_concurrency trigger=${trigger} code=${error.code}`);
        return {
          status: 'noop',
          trigger,
          reason: 'CONCURRENCY_CONFLICT',
        };
      }

      throw error;
    }
  }
}
