import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { TURNOS_SERVICE_TOKEN } from '../../domain/ports/tokens';

/**
 * Adapter: implementa IEventPublisher usando RabbitMQ (ClientProxy de NestJS).
 *
 * ⚕️ HUMAN CHECK - replace direct ClientProxy injection with IEventPublisher token
 * El detalle de RabbitMQ queda aislado en esta capa de infraestructura.
 */
@Injectable()
export class RabbitMQEventPublisher implements IEventPublisher, OnModuleDestroy {
    constructor(
        @Inject(TURNOS_SERVICE_TOKEN) private readonly client: ClientProxy,
    ) {}

    publish(event: string, payload: unknown): void {
        this.client.emit(event, payload);
    }

    // ⚕️ HUMAN CHECK - Lifecycle: cerrar conexión ClientProxy al destruir el módulo
    async onModuleDestroy(): Promise<void> {
        await this.client.close();
    }
}
