import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { EVENT_PUBLISHER_TOKEN } from '../../domain/ports/tokens';
import { MedicalCommandResult } from './medical-command-result';

export interface FinalizeMedicalAttentionCommandData {
  doctorId: string;
}

@Injectable()
export class FinalizeMedicalAttentionCommandUseCase {
  private readonly logger = new Logger(FinalizeMedicalAttentionCommandUseCase.name);

  constructor(
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  execute(data: FinalizeMedicalAttentionCommandData): MedicalCommandResult {
    try {
      const payload = { ...data, commandId: randomUUID() };
      this.eventPublisher.publish('finalizar_atencion_medica', payload);
      this.logger.log(`Comando encolado — finalizar atención médica para doctor ${data.doctorId}`);
      return {
        status: 'accepted',
        message: 'Comando en proceso: finalizar atención médica',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error publicando comando finalizar_atencion_medica: ${message}`);
      throw error;
    }
  }
}
