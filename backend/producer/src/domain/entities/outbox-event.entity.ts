export type OutboxEventStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface OutboxEventToStore {
  eventId: string;
  type: string;
  aggregateType: 'usuario';
  aggregateId: string;
  payload: unknown;
  createdAt: Date;
}

export interface OutboxEventRecord {
  eventId: string;
  type: string;
  aggregateType: 'usuario';
  aggregateId: string;
  payload: unknown;
  status: OutboxEventStatus;
  createdAt: Date;
  processedAt: Date | null;
  retryCount: number;
  nextAttemptAt: Date;
  lastError: string | null;
  processingAt: Date | null;
}