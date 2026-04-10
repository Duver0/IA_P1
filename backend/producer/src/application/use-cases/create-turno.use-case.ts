import { Inject, Injectable, Logger } from '@nestjs/common';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { EVENT_PUBLISHER_TOKEN } from '../../domain/ports/tokens';


export interface CreateTurnoData {
    cedula: number;
    nombre: string;
    priority?: 'alta' | 'media' | 'baja';
}


export interface CreateTurnoResult {
    status: 'accepted';
    message: string;
}


@Injectable()
export class CreateTurnoUseCase {
    private readonly logger = new Logger(CreateTurnoUseCase.name);

    constructor(
        @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
    ) {}

    execute(data: CreateTurnoData): CreateTurnoResult {
        try {
            this.eventPublisher.publish('crear_turno', data);
            this.logger.log(`Turno encolado — paciente ${data.cedula}`);
            return { status: 'accepted', message: 'Turno en proceso de asignación' };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error publicando mensaje: ${message}`);
            throw error;
        }
    }
}
