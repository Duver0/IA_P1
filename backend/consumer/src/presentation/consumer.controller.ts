import { BadRequestException, Controller, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { CreateTurnoUseCase } from '../application/use-cases/create-turno.use-case';
import { MessageProcessingError } from '../application/errors/message-processing.error';
import { DomainRuleError } from '../domain/errors/message-processing.error';
import { AssignDoctorToConsultorioUseCase } from '../application/use-cases/assign-doctor-to-consultorio.use-case';
import { SetDoctorAvailabilityUseCase } from '../application/use-cases/set-doctor-availability.use-case';
import { StartMedicalAttentionUseCase } from '../application/use-cases/start-medical-attention.use-case';
import { FinalizeMedicalAttentionUseCase } from '../application/use-cases/finalize-medical-attention.use-case';
import { ReleaseConsultorioUseCase } from '../application/use-cases/release-consultorio.use-case';
import { ProvisionDoctorFromUserUseCase } from '../application/use-cases/provision-doctor-from-user.use-case';
import { AssignDoctorToConsultorioDto } from './dto/assign-doctor-to-consultorio.dto';
import { SetDoctorAvailabilityDto } from './dto/set-doctor-availability.dto';
import { StartMedicalAttentionDto } from './dto/start-medical-attention.dto';
import { FinalizeMedicalAttentionDto } from './dto/finalize-medical-attention.dto';
import { ReleaseConsultorioDto } from './dto/release-consultorio.dto';
import { UserCreatedDto } from './dto/user-created.dto';

interface ErrorClassification {
    recoverable: boolean;
    code: string;
    category: 'recoverable' | 'non_recoverable';
}

interface EventCorrelation {
    commandId: string;
    userId: string | null;
}

interface RabbitMessage {
    fields?: {
        redelivered?: boolean;
    };
    properties?: {
        messageId?: string;
        correlationId?: string;
        headers?: Record<string, unknown>;
        timestamp?: number;
    };
}

interface RabbitChannel {
    ack(message: unknown): void;
    nack(message: unknown, allUpTo?: boolean, requeue?: boolean): void;
    assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
    sendToQueue(
        queue: string,
        content: Buffer,
        options?: {
            persistent?: boolean;
            contentType?: string;
            headers?: Record<string, unknown>;
        },
    ): boolean;
}

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);
    private readonly maxRequeueAttempts = this.resolveMaxRequeueAttempts();
    private readonly dlqSuffix = process.env.CONSUMER_DLQ_SUFFIX ?? '.dlq';
    private readonly dlqAlertThreshold = this.resolvePositiveInteger(
        process.env.CONSUMER_DLQ_ALERT_THRESHOLD,
        5,
    );
    private readonly metrics = {
        eventsProcessedSuccessfully: 0,
        eventsRoutedToDlq: 0,
        retryRequests: 0,
    };



    constructor(
        private readonly createTurnoUseCase: CreateTurnoUseCase,
        private readonly assignDoctorToConsultorioUseCase: AssignDoctorToConsultorioUseCase,
        private readonly setDoctorAvailabilityUseCase: SetDoctorAvailabilityUseCase,
        private readonly startMedicalAttentionUseCase: StartMedicalAttentionUseCase,
        private readonly finalizeMedicalAttentionUseCase: FinalizeMedicalAttentionUseCase,
        private readonly releaseConsultorioUseCase: ReleaseConsultorioUseCase,
        private readonly provisionDoctorFromUserUseCase: ProvisionDoctorFromUserUseCase,
    ) { }

    private resolveCommandId(eventName: string, data: unknown, context: RmqContext): string {
        const payloadCommandId =
            typeof data === 'object' &&
            data !== null &&
            'commandId' in data &&
            typeof (data as { commandId?: unknown }).commandId === 'string' &&
            (data as { commandId: string }).commandId.trim().length > 0
                ? (data as { commandId: string }).commandId
                : null;

        if (payloadCommandId) {
            return payloadCommandId;
        }

        const message = context.getMessage();
        const messageId = message?.properties?.messageId as string | undefined;
        if (messageId?.trim()) {
            return messageId;
        }

        const correlationId = message?.properties?.correlationId as string | undefined;
        if (correlationId?.trim()) {
            return correlationId;
        }

        const fallbackSeed = `${eventName}:${JSON.stringify(data)}`;
        return createHash('sha256').update(fallbackSeed).digest('hex');
    }

    private async processMessage(
        eventName: string,
        data: unknown,
        context: RmqContext,
        handler: (commandId: string) => Promise<void>,
    ): Promise<void> {
        const channel = context.getChannelRef() as RabbitChannel;
        const originalMsg = context.getMessage() as RabbitMessage;
        const commandId = this.resolveCommandId(eventName, data, context);
        const userId = this.resolveUserId(data);
        const messageId = originalMsg.properties?.messageId ?? 'unknown';
        const correlationId = originalMsg.properties?.correlationId ?? 'unknown';

        this.logger.log(
            `event_received=${JSON.stringify({
                eventName,
                commandId,
                userId,
                messageId,
                correlationId,
            })}`,
        );

        try {
            await handler(commandId);
            this.metrics.eventsProcessedSuccessfully += 1;
            this.logger.log(
                `event_processed_success=${JSON.stringify({
                    eventName,
                    commandId,
                    userId,
                    messageId,
                    correlationId,
                    metrics: this.metrics,
                })}`,
            );
            channel.ack(originalMsg);
        } catch (error: unknown) {
            const classification = this.classifyError(error);
            const attempts = this.getDeliveryAttempts(originalMsg);
            const retryAllowed = classification.recoverable && attempts < this.maxRequeueAttempts;

            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorName = error instanceof Error ? error.name : 'UnknownError';
            const commonLog = {
                eventName,
                commandId,
                userId,
                code: classification.code,
                category: classification.category,
                recoverable: classification.recoverable,
                attempts,
                maxRequeueAttempts: this.maxRequeueAttempts,
                messageId,
                correlationId,
                errorName,
                errorMessage,
            };

            if (retryAllowed) {
                this.metrics.retryRequests += 1;
                this.logger.warn(
                    `retry_decision=${JSON.stringify({
                        ...commonLog,
                        decision: 'nack_requeue',
                        metrics: this.metrics,
                    })}`,
                );
                channel.nack(originalMsg, false, true);
                return;
            }

            try {
                await this.publishToDlq(
                    channel,
                    eventName,
                    data,
                    originalMsg,
                    error,
                    classification,
                    attempts,
                    { commandId, userId },
                );
                this.logger.error(
                    `terminal_error=${JSON.stringify({
                        ...commonLog,
                        decision: 'ack_and_dlq',
                        metrics: this.metrics,
                    })}`,
                );
                channel.ack(originalMsg);
            } catch (dlqError: unknown) {
                const dlqErrorMessage = dlqError instanceof Error ? dlqError.message : String(dlqError);
                this.logger.error(
                    `dlq_publish_failure=${JSON.stringify({
                        ...commonLog,
                        decision: 'nack_no_requeue',
                        dlqErrorMessage,
                        metrics: this.metrics,
                    })}`,
                );
                channel.nack(originalMsg, false, false);
            }
        }
    }

    private async publishToDlq(
        channel: RabbitChannel,
        eventName: string,
        data: unknown,
        originalMsg: RabbitMessage,
        error: unknown,
        classification: ErrorClassification,
        attempts: number,
        correlation: EventCorrelation,
    ): Promise<void> {
        const dlqQueueName = `${eventName}${this.dlqSuffix}`;
        await channel.assertQueue(dlqQueueName, { durable: true });

        const errorName = error instanceof Error ? error.name : 'UnknownError';
        const errorMessage = error instanceof Error ? error.message : String(error);
        const dlqMessage = {
            occurredAt: new Date().toISOString(),
            eventName,
            payload: data,
            classification,
            error: {
                name: errorName,
                message: errorMessage,
            },
            originalMessage: {
                messageId: originalMsg.properties?.messageId ?? null,
                correlationId: originalMsg.properties?.correlationId ?? null,
                headers: originalMsg.properties?.headers ?? {},
                timestamp: originalMsg.properties?.timestamp ?? null,
                redelivered: Boolean(originalMsg.fields?.redelivered),
                attempts,
                commandId: correlation.commandId,
                userId: correlation.userId,
            },
        };

        const published = channel.sendToQueue(
            dlqQueueName,
            Buffer.from(JSON.stringify(dlqMessage)),
            {
                persistent: true,
                contentType: 'application/json',
                headers: {
                    sourceEvent: eventName,
                    classification: classification.category,
                    code: classification.code,
                },
            },
        );

        if (!published) {
            this.logger.warn(`dlq_backpressure event=${eventName} queue=${dlqQueueName}`);
            return;
        }

        this.metrics.eventsRoutedToDlq += 1;
        this.logger.warn(
            `dlq_event_published=${JSON.stringify({
                eventName,
                queue: dlqQueueName,
                commandId: correlation.commandId,
                userId: correlation.userId,
                metrics: this.metrics,
            })}`,
        );

        if (
            this.metrics.eventsRoutedToDlq >= this.dlqAlertThreshold &&
            this.metrics.eventsRoutedToDlq % this.dlqAlertThreshold === 0
        ) {
            this.logger.error(
                `alert_dlq_growth=${JSON.stringify({
                    eventName,
                    queue: dlqQueueName,
                    dlqEvents: this.metrics.eventsRoutedToDlq,
                    threshold: this.dlqAlertThreshold,
                })}`,
            );
        }
    }

    private resolveUserId(data: unknown): string | null {
        return this.readStringField(data, 'userId') ?? this.readStringField(data, 'doctorId');
    }

    private readStringField(payload: unknown, key: string): string | null {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const value = (payload as Record<string, unknown>)[key];
        if (typeof value !== 'string' || !value.trim()) {
            return null;
        }

        return value;
    }

    private classifyError(error: unknown): ErrorClassification {
        if (error instanceof MessageProcessingError) {
            return {
                recoverable: error.recoverable,
                code: error.code,
                category: error.recoverable ? 'recoverable' : 'non_recoverable',
            };
        }

        if (error instanceof DomainRuleError) {
            return {
                recoverable: false,
                code: error.code,
                category: 'non_recoverable',
            };
        }

        if (error instanceof BadRequestException) {
            return {
                recoverable: false,
                code: 'DOMAIN_VALIDATION_FAILURE',
                category: 'non_recoverable',
            };
        }

        if (error instanceof Error && this.isTransientInfrastructureError(error)) {
            return {
                recoverable: true,
                code: 'TRANSIENT_INFRASTRUCTURE_FAILURE',
                category: 'recoverable',
            };
        }

        return {
            recoverable: false,
            code: 'UNEXPECTED_NON_RECOVERABLE_ERROR',
            category: 'non_recoverable',
        };
    }

    private isTransientInfrastructureError(error: Error): boolean {
        const signature = `${error.name} ${error.message}`;
        return [
            /MongoNetworkError/i,
            /MongoServerSelectionError/i,
            /MongoTimeoutError/i,
            /MongooseServerSelectionError/i,
            /ECONNREFUSED/i,
            /ETIMEDOUT/i,
            /EHOSTUNREACH/i,
            /timed out/i,
            /connection reset/i,
            /connection closed/i,
            /temporarily unavailable/i,
        ].some(pattern => pattern.test(signature));
    }

    private getDeliveryAttempts(message: RabbitMessage): number {
        const headerValue = message.properties?.headers?.['x-retry-count'];
        if (typeof headerValue === 'number' && Number.isFinite(headerValue) && headerValue >= 0) {
            return headerValue;
        }

        if (typeof headerValue === 'string') {
            const parsed = Number(headerValue);
            if (Number.isFinite(parsed) && parsed >= 0) {
                return parsed;
            }
        }

        return message.fields?.redelivered ? 1 : 0;
    }

    private resolveMaxRequeueAttempts(): number {
        const configured = Number(process.env.CONSUMER_MAX_REQUEUE_ATTEMPTS ?? '1');
        if (!Number.isFinite(configured) || configured < 0) {
            return 1;
        }

        return Math.floor(configured);
    }

    private resolvePositiveInteger(rawValue: string | undefined, fallback: number): number {
        if (!rawValue) {
            return fallback;
        }

        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return fallback;
        }

        return Math.floor(parsed);
    }

    @EventPattern('crear_turno')
    async handleCrearTurno(@Payload() data: CreateTurnoDto, @Ctx() context: RmqContext): Promise<void> {
        await this.processMessage('crear_turno', data, context, async () => {

            await this.createTurnoUseCase.execute(data);
        });
    }

    @EventPattern('usuario_creado')
    async handleUsuarioCreado(
        @Payload() data: UserCreatedDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('usuario_creado', data, context, async commandId => {
            const result = await this.provisionDoctorFromUserUseCase.execute({
                commandId,
                userId: data.userId,
                email: data.email,
                nombre: data.nombre,
                rol: data.rol,
            });

            this.logger.log(
                `doctor_provisioning=${JSON.stringify({
                    status: result.status,
                    doctorId: result.doctorId,
                    userId: data.userId,
                })}`,
            );
        });
    }

    @EventPattern('asociar_medico_consultorio')
    async handleAsignarMedico(
        @Payload() data: AssignDoctorToConsultorioDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('asociar_medico_consultorio', data, context, async commandId => {
            await this.assignDoctorToConsultorioUseCase.execute({
                doctorId: data.doctorId,
                consultorioId: data.consultorioId,
                commandId,
            });
        });
    }

    @EventPattern('cambiar_disponibilidad_medico')
    async handleCambiarDisponibilidad(
        @Payload() data: SetDoctorAvailabilityDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('cambiar_disponibilidad_medico', data, context, async commandId => {
            await this.setDoctorAvailabilityUseCase.execute({
                doctorId: data.doctorId,
                disponible: data.disponible,
                commandId,
            });
        });
    }

    @EventPattern('iniciar_atencion_medica')
    async handleIniciarAtencion(
        @Payload() data: StartMedicalAttentionDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
          await this.processMessage('iniciar_atencion_medica', data, context, async commandId => {
              await this.startMedicalAttentionUseCase.execute({
                  doctorId: data.doctorId,
                  pacienteNombre: data.pacienteNombre,
                  pacienteDocumento: data.pacienteDocumento,
                  commandId,
              });
        });
    }

    @EventPattern('finalizar_atencion_medica')
    async handleFinalizarAtencion(
        @Payload() data: FinalizeMedicalAttentionDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
          await this.processMessage('finalizar_atencion_medica', data, context, async commandId => {
              await this.finalizeMedicalAttentionUseCase.execute({
                  doctorId: data.doctorId,
                  commandId,
              });
        });
    }

    @EventPattern('liberar_consultorio')
    async handleLiberarConsultorio(
        @Payload() data: ReleaseConsultorioDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        await this.processMessage('liberar_consultorio', data, context, async commandId => {
            await this.releaseConsultorioUseCase.execute({
                doctorId: data.doctorId,
                commandId,
            });
        });
    }
}
