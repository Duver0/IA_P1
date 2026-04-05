import { ConfigService } from '@nestjs/config';
import { ProcessOutboxEventsUseCase } from '../../src/application/use-cases/process-outbox-events.use-case';
import { OutboxPublisherWorker } from '../../src/infrastructure/workers/outbox-publisher.worker';

describe('OutboxPublisherWorker (Infrastructure)', () => {
  const processOutboxEventsUseCase: Pick<ProcessOutboxEventsUseCase, 'execute'> = {
    execute: jest.fn(),
  };

  const configService: Pick<ConfigService, 'get'> = {
    get: jest.fn(),
  };

  let worker: OutboxPublisherWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      const values: Record<string, string> = {
        OUTBOX_PUBLISH_INTERVAL_MS: '1000',
        OUTBOX_BATCH_SIZE: '25',
        OUTBOX_MAX_RETRIES: '10',
        OUTBOX_RETRY_DELAY_MS: '5000',
        OUTBOX_BATCH_FAILURE_ALERT_THRESHOLD: '1',
      };
      return values[key];
    });
    (processOutboxEventsUseCase.execute as jest.Mock).mockResolvedValue({
      scanned: 0,
      published: 0,
      failed: 0,
      skipped: 0,
    });
    worker = new OutboxPublisherWorker(
      processOutboxEventsUseCase as ProcessOutboxEventsUseCase,
      configService as ConfigService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispara flush inmediato y periódico con la configuración esperada', async () => {
    // Act
    worker.onModuleInit();
    await Promise.resolve();

    // Assert: flush inmediato
    expect(processOutboxEventsUseCase.execute).toHaveBeenCalledWith({
      batchSize: 25,
      maxRetries: 10,
      baseRetryDelayMs: 5000,
    });

    // Act: siguiente tick por intervalo
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Assert: ejecución periódica
    expect((processOutboxEventsUseCase.execute as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('emite alerta cuando los fallos del batch superan el umbral', async () => {
    // Arrange
    (processOutboxEventsUseCase.execute as jest.Mock).mockResolvedValue({
      scanned: 2,
      published: 0,
      failed: 2,
      skipped: 0,
    });
    const loggerErrorSpy = jest.spyOn((worker as unknown as { logger: { error: (msg: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);

    // Act
    await (worker as unknown as { tick: () => Promise<void> }).tick();

    // Assert
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('alert_outbox_batch_failures='),
    );
  });

  it('omite ejecución cuando ya hay un tick en progreso', async () => {
    // Arrange
    (worker as unknown as { isRunning: boolean }).isRunning = true;

    // Act
    await (worker as unknown as { tick: () => Promise<void> }).tick();

    // Assert
    expect(processOutboxEventsUseCase.execute).not.toHaveBeenCalled();
  });

  it('usa valores fallback cuando la configuración es inválida', async () => {
    // Arrange
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      const values: Record<string, string> = {
        OUTBOX_PUBLISH_INTERVAL_MS: '-1',
        OUTBOX_BATCH_SIZE: '0',
        OUTBOX_MAX_RETRIES: 'NaN',
        OUTBOX_RETRY_DELAY_MS: '-200',
        OUTBOX_BATCH_FAILURE_ALERT_THRESHOLD: '-5',
      };
      return values[key];
    });
    worker = new OutboxPublisherWorker(
      processOutboxEventsUseCase as ProcessOutboxEventsUseCase,
      configService as ConfigService,
    );

    // Act
    worker.onModuleInit();
    await Promise.resolve();

    // Assert: usa fallback de batch config
    expect(processOutboxEventsUseCase.execute).toHaveBeenCalledWith({
      batchSize: 25,
      maxRetries: 10,
      baseRetryDelayMs: 5000,
    });

    // Assert: usa fallback de intervalo (5000ms)
    const callsBefore = (processOutboxEventsUseCase.execute as jest.Mock).mock.calls.length;
    jest.advanceTimersByTime(4999);
    await Promise.resolve();
    expect((processOutboxEventsUseCase.execute as jest.Mock).mock.calls.length).toBe(callsBefore);

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect((processOutboxEventsUseCase.execute as jest.Mock).mock.calls.length).toBe(callsBefore + 1);
  });

  it('se recupera de un fallo en tick y permite ejecuciones posteriores', async () => {
    // Arrange
    const loggerErrorSpy = jest
      .spyOn((worker as unknown as { logger: { error: (msg: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);
    (processOutboxEventsUseCase.execute as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        scanned: 0,
        published: 0,
        failed: 0,
        skipped: 0,
      });

    // Act
    await (worker as unknown as { tick: () => Promise<void> }).tick();
    await (worker as unknown as { tick: () => Promise<void> }).tick();

    // Assert
    expect(processOutboxEventsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Outbox worker failure: boom');
  });

  it('limpia el intervalo al destruir el módulo', () => {
    // Arrange
    worker.onModuleInit();

    // Act
    worker.onModuleDestroy();

    // Assert
    expect((worker as unknown as { timer: NodeJS.Timeout | null }).timer).toBeNull();
  });

  it('no falla al destruir módulo cuando nunca se inicializó el timer', () => {
    expect(() => worker.onModuleDestroy()).not.toThrow();
  });
});
