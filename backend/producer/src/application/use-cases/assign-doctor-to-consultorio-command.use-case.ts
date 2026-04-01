import { Inject, Injectable, Logger } from '@nestjs/common';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { EVENT_PUBLISHER_TOKEN } from '../../domain/ports/tokens';
import { MedicalCommandResult } from './medical-command-result';

export interface AssignDoctorToConsultorioCommandData {
  doctorId: string;
  consultorioId: string;
}

@Injectable()
export class AssignDoctorToConsultorioCommandUseCase {
  private readonly logger = new Logger(AssignDoctorToConsultorioCommandUseCase.name);

  constructor(
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  execute(data: AssignDoctorToConsultorioCommandData): MedicalCommandResult {
    try {
      this.eventPublisher.publish('asociar_medico_consultorio', data);
      this.logger.log(`Comando encolado — asociar médico ${data.doctorId} a consultorio ${data.consultorioId}`);
      return {
        status: 'accepted',
        message: 'Comando en proceso: asociar médico a consultorio',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error publicando comando asociar_medico_consultorio: ${message}`);
      throw error;
    }
  }
}
