import { Inject, Injectable, Logger } from '@nestjs/common';
import { IOutboxEventPublisher } from '../../domain/ports/IOutboxEventPublisher';
import { IOutboxRepository } from '../../domain/ports/IOutboxRepository';
import { OUTBOX_EVENT_PUBLISHER_TOKEN, OUTBOX_REPOSITORY_TOKEN } from '../../domain/ports/tokens';

export interface ProcessOutboxEventsResult {
  scanned: number;
  published: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class ProcessOutboxEventsUseCase {
  private readonly logger = new Logger(ProcessOutboxEventsUseCase.name);
  private readonly repeatedFailureAlertThreshold = this.resolvePositiveInteger(
    process.env.OUTBOX_FAILURE_ALERT_THRESHOLD,
    3,
  );
  private readonly metrics = {
    eventsPublished: 0,
    eventsFailed: 0,
    retryAttempts: 0,
    eventsProcessedSuccessfully: 0,
  };
  private consecutiveFailureCount = 0;

  constructor(
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository: IOutboxRepository,
    @Inject(OUTBOX_EVENT_PUBLISHER_TOKEN)
    private readonly outboxEventPublisher: IOutboxEventPublisher,
  ) {}

  async execute(options?: {
    batchSize?: number;
    maxRetries?: number;
    baseRetryDelayMs?: number;
    now?: Date;
  }): Promise<ProcessOutboxEventsResult> {
    const now = options?.now ?? new Date();
    const batchSize = options?.batchSize ?? 25;
    const maxRetries = options?.maxRetries ?? 10;
    const baseRetryDelayMs = options?.baseRetryDelayMs ?? 5_000;

    const candidates = await this.outboxRepository.findPublishable(batchSize, now, maxRetries);
    let published = 0;
    let failed = 0;
    let skipped = 0;

    for (const event of candidates) {
      const claimed = await this.outboxRepository.claimForPublishing(event.eventId, now);
      const correlation = this.extractCorrelation(event.payload);
      const attemptNumber = event.retryCount + 1;

      if (!claimed) {
        skipped += 1;
        continue;
      }

      if (attemptNumber > 1) {
        this.metrics.retryAttempts += 1;
      }

      this.logger.log(
        `outbox_publish_attempt=${JSON.stringify({
          eventId: event.eventId,
          type: event.type,
          attemptNumber,
          commandId: correlation.commandId,
          userId: correlation.userId,
        })}`,
      );

      try {
        await this.outboxEventPublisher.publish(event.type, event.payload);
        await this.outboxRepository.markProcessed(event.eventId, new Date());
        published += 1;
        this.metrics.eventsPublished += 1;
        this.metrics.eventsProcessedSuccessfully += 1;
        this.consecutiveFailureCount = 0;

        this.logger.log(
          `outbox_publish_success=${JSON.stringify({
            eventId: event.eventId,
            type: event.type,
            attemptNumber,
            commandId: correlation.commandId,
            userId: correlation.userId,
          })}`,
        );
      } catch (error: unknown) {
        failed += 1;
        this.metrics.eventsFailed += 1;
        this.consecutiveFailureCount += 1;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const nextAttemptAt = this.calculateNextAttempt(
          now,
          event.retryCount + 1,
          baseRetryDelayMs,
        );
        await this.outboxRepository.markFailed(event.eventId, errorMessage, nextAttemptAt);
        this.logger.warn(
          `outbox_publish_failed=${JSON.stringify({
            eventId: event.eventId,
            type: event.type,
            attemptNumber,
            nextAttemptAt: nextAttemptAt.toISOString(),
            commandId: correlation.commandId,
            userId: correlation.userId,
            errorMessage,
          })}`,
        );

        if (this.consecutiveFailureCount >= this.repeatedFailureAlertThreshold) {
          this.logger.error(
            `alert_outbox_publish_repeated_failures=${JSON.stringify({
              consecutiveFailures: this.consecutiveFailureCount,
              threshold: this.repeatedFailureAlertThreshold,
              latestEventId: event.eventId,
              latestCommandId: correlation.commandId,
              latestUserId: correlation.userId,
            })}`,
          );
        }
      }
    }

    if (candidates.length > 0 || failed > 0) {
      this.logger.log(
        `outbox_metrics=${JSON.stringify({
          scanned: candidates.length,
          published,
          failed,
          skipped,
          totals: this.metrics,
        })}`,
      );
    }

    return {
      scanned: candidates.length,
      published,
      failed,
      skipped,
    };
  }

  private calculateNextAttempt(now: Date, retryCount: number, baseRetryDelayMs: number): Date {
    const cappedAttempt = Math.min(retryCount, 6);
    const delay = baseRetryDelayMs * 2 ** (cappedAttempt - 1);
    return new Date(now.getTime() + delay);
  }

  private extractCorrelation(payload: unknown): { commandId: string | null; userId: string | null } {
    return {
      commandId: this.readStringField(payload, 'commandId'),
      userId: this.readStringField(payload, 'userId'),
    };
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
}