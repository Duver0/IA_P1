import { Inject, Injectable, Logger } from '@nestjs/common';
import { Turno, TurnoEventPayload } from '../../domain/entities/turno.entity';
import { CreateTurnoData } from '../../domain/ports/ITurnoRepository';
import { ITurnoCreationRepository } from '../../domain/ports/ITurnoCreationRepository';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { INotificationGateway } from '../../domain/ports/INotificationGateway';
import { DomainRuleError } from '../../domain/errors/message-processing.error';
import { AssignPatientToConsultorioUseCase } from './assign-patient-to-consultorio.use-case';
import {
    TURNO_CREATION_REPOSITORY_TOKEN,
    EVENT_PUBLISHER_TOKEN,
    NOTIFICATION_GATEWAY_TOKEN,
} from '../../domain/ports/tokens';


export interface CreateTurnoResult {
    turno: Turno;
    eventPayload: TurnoEventPayload;
}


@Injectable()
export class CreateTurnoUseCase {
    private readonly logger = new Logger(CreateTurnoUseCase.name);

    constructor(
        @Inject(TURNO_CREATION_REPOSITORY_TOKEN)
        private readonly turnoRepository: ITurnoCreationRepository,
        @Inject(EVENT_PUBLISHER_TOKEN) private readonly eventPublisher: IEventPublisher,
        @Inject(NOTIFICATION_GATEWAY_TOKEN) private readonly notificationGateway: INotificationGateway,
        private readonly assignPatientToConsultorioUseCase: AssignPatientToConsultorioUseCase,
    ) {}

    async execute(data: CreateTurnoData): Promise<CreateTurnoResult> {
        const activo = await this.turnoRepository.findActivoPorCedula(data.cedula);
        if (activo) {
            throw new DomainRuleError(
                'El paciente ya tiene un turno en espera o en atención',
                'ACTIVE_TURNO_ALREADY_EXISTS',
            );
        }


        const turno = await this.turnoRepository.save(data);
        this.logger.log(`Turno creado en espera — paciente ${turno.cedula}, ID: ${turno.id}`);


        await this.notificationGateway.sendNotification(
            String(turno.cedula),
            turno.consultorio,
        );


        const eventPayload = turno.toEventPayload();
        this.eventPublisher.publish('turno_creado', eventPayload);


        try {
            await this.assignPatientToConsultorioUseCase.execute('PatientCreated');
        } catch (error) {
            this.logger.error(
                `Error al intentar asignación event-driven después de crear turno ${turno.id}`,
                (error as Error).stack,
            );
        }

        return { turno, eventPayload };
    }
}
