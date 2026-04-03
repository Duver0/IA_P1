import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { IOutboxEventPublisher } from '../../domain/ports/IOutboxEventPublisher';

@Injectable()
export class RabbitMQOutboxEventPublisher implements IOutboxEventPublisher, OnModuleDestroy {
  private readonly queueName: string;
  private readonly connection: amqp.AmqpConnectionManager;
  private readonly channel: ChannelWrapper;

  constructor(private readonly configService: ConfigService) {
    const rabbitUrl = this.configService.get<string>('RABBITMQ_URL');
    if (!rabbitUrl) {
      throw new Error('RABBITMQ_URL environment variable is required');
    }

    this.queueName = this.configService.get<string>('RABBITMQ_QUEUE', 'turnos_queue');
    this.connection = amqp.connect([rabbitUrl]);
    this.channel = this.connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.assertQueue(this.queueName, { durable: true });
      },
    });
  }

  async publish(event: string, payload: unknown): Promise<void> {
    const message = Buffer.from(JSON.stringify({ pattern: event, data: payload }));
    const publishOptions = {
      persistent: true,
      contentType: 'application/json',
    } as Parameters<ChannelWrapper['sendToQueue']>[2];

    await this.channel.sendToQueue(this.queueName, message, publishOptions);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}