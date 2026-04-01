import { Inject, Injectable, Logger } from '@nestjs/common';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { EVENT_PUBLISHER_TOKEN } from '../../domain/ports/tokens';
import { MedicalCommandResult } from './medical-command-result';

export interface StartMedicalAttentionCommandData {
  doctorId: string;
  pacienteNombre: string;
  pacienteDocumento: string;
}

@Injectable()
export class StartMedicalAttentionCommandUseCase {
  private readonly logger = new Logger(StartMedicalAttentionCommandUseCase.name);

  constructor(
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  execute(data: StartMedicalAttentionCommandData): MedicalCommandResult {
    try {
      this.eventPublisher.publish('iniciar_atencion_medica', data);
      this.logger.log(`Comando encolado — iniciar atención médica para doctor ${data.doctorId}`);
      return {
        status: 'accepted',
        message: 'Comando en proceso: iniciar atención médica',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error publicando comando iniciar_atencion_medica: ${message}`);
      throw error;
    }
  }
}
