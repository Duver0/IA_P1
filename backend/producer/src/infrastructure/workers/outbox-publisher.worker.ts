import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProcessOutboxEventsUseCase } from '../../application/use-cases/process-outbox-events.use-case';

@Injectable()
export class OutboxPublisherWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherWorker.name);
  private readonly batchFailureAlertThreshold: number;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly processOutboxEventsUseCase: ProcessOutboxEventsUseCase,
    private readonly configService: ConfigService,
  ) {
    this.batchFailureAlertThreshold = this.getNumberConfig('OUTBOX_BATCH_FAILURE_ALERT_THRESHOLD', 1);
  }

  onModuleInit(): void {
    const intervalMs = this.getNumberConfig('OUTBOX_PUBLISH_INTERVAL_MS', 5000);

    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);

    void this.tick();
    this.logger.log(`Outbox worker activo con intervalo de ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const result = await this.processOutboxEventsUseCase.execute({
        batchSize: this.getNumberConfig('OUTBOX_BATCH_SIZE', 25),
        maxRetries: this.getNumberConfig('OUTBOX_MAX_RETRIES', 10),
        baseRetryDelayMs: this.getNumberConfig('OUTBOX_RETRY_DELAY_MS', 5000),
      });

      if (result.scanned > 0 || result.failed > 0) {
        this.logger.log(
          `outbox_batch_summary=${JSON.stringify({
            scanned: result.scanned,
            published: result.published,
            failed: result.failed,
            skipped: result.skipped,
          })}`,
        );
      }

      if (result.failed >= this.batchFailureAlertThreshold) {
        this.logger.error(
          `alert_outbox_batch_failures=${JSON.stringify({
            failedInBatch: result.failed,
            threshold: this.batchFailureAlertThreshold,
          })}`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Outbox worker failure: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private getNumberConfig(name: string, fallback: number): number {
    const raw = this.configService.get<string>(name);

    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}