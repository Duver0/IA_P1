import { BadRequestException, Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { CreateTurnoUseCase } from '../application/use-cases/create-turno.use-case';
import { ConsultorioDomainError } from '../domain/entities/consultorio-session.entity';
import { AssignDoctorToConsultorioUseCase } from '../application/use-cases/assign-doctor-to-consultorio.use-case';
import { SetDoctorAvailabilityUseCase } from '../application/use-cases/set-doctor-availability.use-case';
import { StartMedicalAttentionUseCase } from '../application/use-cases/start-medical-attention.use-case';
import { FinalizeMedicalAttentionUseCase } from '../application/use-cases/finalize-medical-attention.use-case';
import { ReleaseConsultorioUseCase } from '../application/use-cases/release-consultorio.use-case';
import { AssignDoctorToConsultorioDto } from './dto/assign-doctor-to-consultorio.dto';
import { SetDoctorAvailabilityDto } from './dto/set-doctor-availability.dto';
import { StartMedicalAttentionDto } from './dto/start-medical-attention.dto';
import { FinalizeMedicalAttentionDto } from './dto/finalize-medical-attention.dto';
import { ReleaseConsultorioDto } from './dto/release-consultorio.dto';

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);

    // ⚕️ HUMAN CHECK - SRP: Controller solo maneja transporte RabbitMQ (ack/nack),
    // delega la lógica de negocio al Use Case
    constructor(
        private readonly createTurnoUseCase: CreateTurnoUseCase,
        private readonly assignDoctorToConsultorioUseCase: AssignDoctorToConsultorioUseCase,
        private readonly setDoctorAvailabilityUseCase: SetDoctorAvailabilityUseCase,
        private readonly startMedicalAttentionUseCase: StartMedicalAttentionUseCase,
        private readonly finalizeMedicalAttentionUseCase: FinalizeMedicalAttentionUseCase,
        private readonly releaseConsultorioUseCase: ReleaseConsultorioUseCase,
    ) { }

    private async processMessage(
        eventName: string,
        data: unknown,
        context: RmqContext,
        handler: () => Promise<void>,
    ): Promise<void> {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();

        this.logger.log(`Recibido evento ${eventName}: ${JSON.stringify(data)}`);

        try {
            await handler();
            channel.ack(originalMsg);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error procesando evento ${eventName}: ${message}`);

            const nonRecoverableError =
                error instanceof BadRequestException || error instanceof ConsultorioDomainError;

            channel.nack(originalMsg, false, !nonRecoverableError);
        }
    }

    @EventPattern('crear_turno')
    async handleCrearTurno(@Payload() data: CreateTurnoDto, @Ctx() context: RmqContext): Promise<void> {
        await this.processMessage('crear_turno', data, context, async () => {
            // ⚕️ HUMAN CHECK - La validación de cedula la maneja ValidationPipe + @IsNumber() en CreateTurnoDto
            await this.createTurnoUseCase.execute(data);
        });
    }

    @EventPattern('asociar_medico_consultorio')
    async handleAsignarMedico(
        @Payload() data: AssignDoctorToConsultorioDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('asociar_medico_consultorio', data, context, async () => {
            await this.assignDoctorToConsultorioUseCase.execute(data);
        });
    }

    @EventPattern('cambiar_disponibilidad_medico')
    async handleCambiarDisponibilidad(
        @Payload() data: SetDoctorAvailabilityDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('cambiar_disponibilidad_medico', data, context, async () => {
            await this.setDoctorAvailabilityUseCase.execute(data);
        });
    }

    @EventPattern('iniciar_atencion_medica')
    async handleIniciarAtencion(
        @Payload() data: StartMedicalAttentionDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('iniciar_atencion_medica', data, context, async () => {
            await this.startMedicalAttentionUseCase.execute(data);
        });
    }

    @EventPattern('finalizar_atencion_medica')
    async handleFinalizarAtencion(
        @Payload() data: FinalizeMedicalAttentionDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('finalizar_atencion_medica', data, context, async () => {
            await this.finalizeMedicalAttentionUseCase.execute(data);
        });
    }

    @EventPattern('liberar_consultorio')
    async handleLiberarConsultorio(
        @Payload() data: ReleaseConsultorioDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('liberar_consultorio', data, context, async () => {
            await this.releaseConsultorioUseCase.execute(data);
        });
    }
}
