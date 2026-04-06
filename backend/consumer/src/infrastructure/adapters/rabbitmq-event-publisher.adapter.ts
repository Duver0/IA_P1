import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';


@Injectable()
export class RabbitMQEventPublisher implements IEventPublisher, OnModuleDestroy {
    constructor(
        @Inject('TURNOS_NOTIFICATIONS') private readonly client: ClientProxy,
    ) {}

    publish(event: string, payload: unknown): void {
        this.client.emit(event, payload);
    }


    async onModuleDestroy(): Promise<void> {
        await this.client.close();
    }
}
