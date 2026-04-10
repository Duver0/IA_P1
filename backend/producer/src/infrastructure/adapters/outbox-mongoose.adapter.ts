import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { OutboxEventRecord, OutboxEventToStore } from '../../domain/entities/outbox-event.entity';
import { IOutboxRepository } from '../../domain/ports/IOutboxRepository';
import { TransactionContext } from '../../domain/ports/IUnitOfWork';
import { OutboxEvent, OutboxEventDocument } from '../schemas/outbox-event.schema';

@Injectable()
export class OutboxMongooseAdapter implements IOutboxRepository {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEventDocument>,
  ) {}

  async insert(event: OutboxEventToStore, tx?: TransactionContext): Promise<void> {
    const mongoSession = this.resolveMongoSession(tx);

    await this.outboxModel.create(
      [
        {
          eventId: event.eventId,
          type: event.type,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
          status: 'PENDING',
          createdAt: event.createdAt,
          processedAt: null,
          retryCount: 0,
          nextAttemptAt: event.createdAt,
          lastError: null,
          processingAt: null,
        },
      ],
      mongoSession ? { session: mongoSession } : undefined,
    );
  }

  async findPublishable(limit: number, now: Date, maxRetries: number): Promise<OutboxEventRecord[]> {
    const docs = await this.outboxModel
      .find({
        status: { $in: ['PENDING', 'FAILED'] },
        processingAt: null,
        nextAttemptAt: { $lte: now },
        retryCount: { $lte: maxRetries },
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();

    return docs.map(doc => this.toRecord(doc));
  }

  async claimForPublishing(eventId: string, claimedAt: Date): Promise<boolean> {
    const result = await this.outboxModel.updateOne(
      {
        eventId,
        status: { $in: ['PENDING', 'FAILED'] },
        processingAt: null,
      },
      {
        $set: {
          processingAt: claimedAt,
        },
      },
    );

    return result.modifiedCount > 0;
  }

  async markProcessed(eventId: string, processedAt: Date): Promise<void> {
    await this.outboxModel.updateOne(
      { eventId },
      {
        $set: {
          status: 'PROCESSED',
          processedAt,
          processingAt: null,
          lastError: null,
        },
      },
    );
  }

  async markFailed(eventId: string, errorMessage: string, nextAttemptAt: Date): Promise<void> {
    await this.outboxModel.updateOne(
      { eventId },
      {
        $set: {
          status: 'FAILED',
          processingAt: null,
          lastError: errorMessage,
          nextAttemptAt,
        },
        $inc: {
          retryCount: 1,
        },
      },
    );
  }

  private toRecord(doc: OutboxEventDocument): OutboxEventRecord {
    return {
      eventId: doc.eventId,
      type: doc.type,
      aggregateType: doc.aggregateType,
      aggregateId: doc.aggregateId,
      payload: doc.payload,
      status: doc.status,
      createdAt: doc.createdAt,
      processedAt: doc.processedAt,
      retryCount: doc.retryCount,
      nextAttemptAt: doc.nextAttemptAt,
      lastError: doc.lastError,
      processingAt: doc.processingAt,
    };
  }

  private resolveMongoSession(tx?: TransactionContext): ClientSession | null {
    if (!tx) {
      return null;
    }

    if (tx.kind !== 'mongo') {
      throw new Error(`Tipo de transaccion no soportado: ${tx.kind}`);
    }

    return tx.value as ClientSession;
  }
}