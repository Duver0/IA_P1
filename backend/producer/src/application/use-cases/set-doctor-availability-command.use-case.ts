import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { EVENT_PUBLISHER_TOKEN } from '../../domain/ports/tokens';
import { MedicalCommandResult } from './medical-command-result';

export interface SetDoctorAvailabilityCommandData {
  doctorId: string;
  disponible: boolean;
}

@Injectable()
export class SetDoctorAvailabilityCommandUseCase {
  private readonly logger = new Logger(SetDoctorAvailabilityCommandUseCase.name);

  constructor(
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  execute(data: SetDoctorAvailabilityCommandData): MedicalCommandResult {
    try {
      const payload = { ...data, commandId: randomUUID() };
      this.eventPublisher.publish('cambiar_disponibilidad_medico', payload);
      this.logger.log(`Comando encolado — disponibilidad médico ${data.doctorId}: ${data.disponible}`);
      return {
        status: 'accepted',
        message: 'Comando en proceso: actualizar disponibilidad médica',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error publicando comando cambiar_disponibilidad_medico: ${message}`);
      throw error;
    }
  }
}
