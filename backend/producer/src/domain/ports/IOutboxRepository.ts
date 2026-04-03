import { OutboxEventRecord, OutboxEventToStore } from '../entities/outbox-event.entity';
import { TransactionContext } from './IUnitOfWork';

export interface IOutboxRepository {
  insert(event: OutboxEventToStore, tx?: TransactionContext): Promise<void>;
  findPublishable(limit: number, now: Date, maxRetries: number): Promise<OutboxEventRecord[]>;
  claimForPublishing(eventId: string, claimedAt: Date): Promise<boolean>;
  markProcessed(eventId: string, processedAt: Date): Promise<void>;
  markFailed(eventId: string, errorMessage: string, nextAttemptAt: Date): Promise<void>;
}