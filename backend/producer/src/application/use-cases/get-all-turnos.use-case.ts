import { Inject, Injectable } from '@nestjs/common';
import { Turno, TurnoEventPayload } from '../../domain/entities/turno.entity';
import { ITurnoRepository } from '../../domain/ports/ITurnoRepository';
import { TURNO_REPOSITORY_TOKEN } from '../../domain/ports/tokens';


@Injectable()
export class GetAllTurnosUseCase {
    constructor(
        @Inject(TURNO_REPOSITORY_TOKEN) private readonly turnoRepository: ITurnoRepository,
    ) {}

    async execute(): Promise<TurnoEventPayload[]> {
        const turnos: Turno[] = await this.turnoRepository.findAll();
        return turnos.map(t => t.toEventPayload());
    }
}
