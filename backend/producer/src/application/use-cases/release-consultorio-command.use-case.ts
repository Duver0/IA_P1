import { Inject, Injectable, Logger } from '@nestjs/common';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { EVENT_PUBLISHER_TOKEN } from '../../domain/ports/tokens';
import { MedicalCommandResult } from './medical-command-result';

export interface ReleaseConsultorioCommandData {
  doctorId: string;
}

@Injectable()
export class ReleaseConsultorioCommandUseCase {
  private readonly logger = new Logger(ReleaseConsultorioCommandUseCase.name);

  constructor(
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  execute(data: ReleaseConsultorioCommandData): MedicalCommandResult {
    try {
      this.eventPublisher.publish('liberar_consultorio', data);
      this.logger.log(`Comando encolado — liberar consultorio para doctor ${data.doctorId}`);
      return {
        status: 'accepted',
        message: 'Comando en proceso: liberar consultorio',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error publicando comando liberar_consultorio: ${message}`);
      throw error;
    }
  }
}
