import {
  ProcessOutboxEventsUseCase,
  ProcessOutboxEventsResult,
} from '../../src/application/use-cases/process-outbox-events.use-case';
import { OutboxEventRecord } from '../../src/domain/entities/outbox-event.entity';
import { IOutboxEventPublisher } from '../../src/domain/ports/IOutboxEventPublisher';
import { IOutboxRepository } from '../../src/domain/ports/IOutboxRepository';

const buildEvent = (overrides?: Partial<OutboxEventRecord>): OutboxEventRecord => ({
  eventId: 'evt-1',
  type: 'usuario_creado',
  aggregateType: 'usuario',
  aggregateId: 'doctor-1',
  payload: {
    commandId: 'evt-1',
    userId: 'doctor-1',
    email: 'medico@example.com',
    nombre: 'Dra. Paula',
    rol: 'medico',
    eventVersion: 1,
    occurredAt: '2026-04-02T00:00:00.000Z',
    source: 'producer.auth.signup',
  },
  status: 'PENDING',
  createdAt: new Date('2026-04-02T00:00:00.000Z'),
  processedAt: null,
  retryCount: 0,
  nextAttemptAt: new Date('2026-04-02T00:00:00.000Z'),
  lastError: null,
  processingAt: null,
  ...overrides,
});

describe('ProcessOutboxEventsUseCase (Application)', () => {
  const originalFailureThreshold = process.env.OUTBOX_FAILURE_ALERT_THRESHOLD;

  let outboxRepository: jest.Mocked<IOutboxRepository>;
  let outboxEventPublisher: jest.Mocked<IOutboxEventPublisher>;
  let useCase: ProcessOutboxEventsUseCase;

  beforeEach(() => {
    delete process.env.OUTBOX_FAILURE_ALERT_THRESHOLD;

    outboxRepository = {
      insert: jest.fn(),
      findPublishable: jest.fn(),
      claimForPublishing: jest.fn(),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
    } as jest.Mocked<IOutboxRepository>;

    outboxEventPublisher = {
      publish: jest.fn(),
    } as jest.Mocked<IOutboxEventPublisher>;

    useCase = new ProcessOutboxEventsUseCase(outboxRepository, outboxEventPublisher);
  });

  afterAll(() => {
    if (originalFailureThreshold === undefined) {
      delete process.env.OUTBOX_FAILURE_ALERT_THRESHOLD;
      return;
    }

    process.env.OUTBOX_FAILURE_ALERT_THRESHOLD = originalFailureThreshold;
  });

  it('publica evento pending y marca processed', async () => {
    // Arrange
    const event = buildEvent();
    outboxRepository.findPublishable.mockResolvedValue([event]);
    outboxRepository.claimForPublishing.mockResolvedValue(true);
    outboxEventPublisher.publish.mockResolvedValue(undefined);

    // Act
    const result: ProcessOutboxEventsResult = await useCase.execute({
      now: new Date('2026-04-02T10:00:00.000Z'),
      batchSize: 10,
      maxRetries: 5,
      baseRetryDelayMs: 1000,
    });

    // Assert
    expect(outboxRepository.findPublishable).toHaveBeenCalledWith(
      10,
      new Date('2026-04-02T10:00:00.000Z'),
      5,
    );
    expect(outboxRepository.claimForPublishing).toHaveBeenCalledWith(
      'evt-1',
      new Date('2026-04-02T10:00:00.000Z'),
    );
    expect(outboxEventPublisher.publish).toHaveBeenCalledWith('usuario_creado', event.payload);
    expect(outboxRepository.markProcessed).toHaveBeenCalledTimes(1);
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, published: 1, failed: 0, skipped: 0 });
  });

  it('omite publicación si otro worker reclama el mismo evento', async () => {
    // Arrange
    const event = buildEvent();
    outboxRepository.findPublishable.mockResolvedValue([event]);
    outboxRepository.claimForPublishing.mockResolvedValue(false);

    // Act
    const result = await useCase.execute({ now: new Date('2026-04-02T10:00:00.000Z') });

    // Assert
    expect(outboxEventPublisher.publish).not.toHaveBeenCalled();
    expect(outboxRepository.markProcessed).not.toHaveBeenCalled();
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, published: 0, failed: 0, skipped: 1 });
  });

  it('marca failed y programa reintento exponencial cuando falla RabbitMQ', async () => {
    // Arrange
    const now = new Date('2026-04-02T10:00:00.000Z');
    const event = buildEvent({ retryCount: 1, status: 'FAILED' });

    outboxRepository.findPublishable.mockResolvedValue([event]);
    outboxRepository.claimForPublishing.mockResolvedValue(true);
    outboxEventPublisher.publish.mockRejectedValue(new Error('broker down'));

    // Act
    const result = await useCase.execute({
      now,
      baseRetryDelayMs: 1000,
    });

    // Assert
    expect(outboxRepository.markProcessed).not.toHaveBeenCalled();
    expect(outboxRepository.markFailed).toHaveBeenCalledWith(
      'evt-1',
      'broker down',
      new Date('2026-04-02T10:00:02.000Z'),
    );
    expect(result).toEqual({ scanned: 1, published: 0, failed: 1, skipped: 0 });
  });

  it('reintenta evento failed y lo marca processed cuando RabbitMQ se recupera', async () => {
    // Arrange
    const failedEvent = buildEvent({ eventId: 'evt-retry', retryCount: 1, status: 'FAILED' });

    outboxRepository.findPublishable.mockResolvedValue([failedEvent]);
    outboxRepository.claimForPublishing.mockResolvedValue(true);
    outboxEventPublisher.publish.mockResolvedValue(undefined);

    // Act
    const result = await useCase.execute({ now: new Date('2026-04-02T10:05:00.000Z') });

    // Assert
    expect(outboxEventPublisher.publish).toHaveBeenCalledWith('usuario_creado', failedEvent.payload);
    expect(outboxRepository.markProcessed).toHaveBeenCalledWith(
      'evt-retry',
      expect.any(Date),
    );
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, published: 1, failed: 0, skipped: 0 });
  });

  it('no emite métricas cuando no hay candidatos para publicar', async () => {
    // Arrange
    outboxRepository.findPublishable.mockResolvedValue([]);
    const logSpy = jest
      .spyOn((useCase as unknown as { logger: { log: (msg: string) => void } }).logger, 'log')
      .mockImplementation(() => undefined);

    // Act
    const result = await useCase.execute({ now: new Date('2026-04-02T10:00:00.000Z') });

    // Assert
    expect(result).toEqual({ scanned: 0, published: 0, failed: 0, skipped: 0 });
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('outbox_metrics='));
  });

  it('alerta fallos consecutivos cuando el umbral es 1 y el error no es instancia de Error', async () => {
    // Arrange
    process.env.OUTBOX_FAILURE_ALERT_THRESHOLD = '1';
    useCase = new ProcessOutboxEventsUseCase(outboxRepository, outboxEventPublisher);
    const errorSpy = jest
      .spyOn((useCase as unknown as { logger: { error: (msg: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);

    outboxRepository.findPublishable.mockResolvedValue([
      buildEvent({ payload: 'invalid-payload' as unknown as Record<string, unknown> }),
    ]);
    outboxRepository.claimForPublishing.mockResolvedValue(true);
    outboxEventPublisher.publish.mockRejectedValue('broker unavailable');

    // Act
    const result = await useCase.execute({ now: new Date('2026-04-02T10:00:00.000Z') });

    // Assert
    expect(outboxRepository.markFailed).toHaveBeenCalledWith(
      'evt-1',
      'broker unavailable',
      new Date('2026-04-02T10:00:05.000Z'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('alert_outbox_publish_repeated_failures='),
    );
    expect(result).toEqual({ scanned: 1, published: 0, failed: 1, skipped: 0 });
  });

  it('usa fallback del umbral cuando la variable de entorno es inválida', async () => {
    // Arrange
    process.env.OUTBOX_FAILURE_ALERT_THRESHOLD = 'not-a-number';
    useCase = new ProcessOutboxEventsUseCase(outboxRepository, outboxEventPublisher);
    const errorSpy = jest
      .spyOn((useCase as unknown as { logger: { error: (msg: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);

    outboxRepository.findPublishable.mockResolvedValue([
      buildEvent({
        payload: { commandId: '', userId: '   ' } as unknown as Record<string, unknown>,
      }),
    ]);
    outboxRepository.claimForPublishing.mockResolvedValue(true);
    outboxEventPublisher.publish.mockRejectedValue(new Error('broker down'));

    // Act
    await useCase.execute({ now: new Date('2026-04-02T10:00:00.000Z') });

    // Assert
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('alert_outbox_publish_repeated_failures='),
    );
  });

  it('aplica umbral positivo y alerta después de la segunda falla consecutiva', async () => {
    // Arrange
    process.env.OUTBOX_FAILURE_ALERT_THRESHOLD = '2.9';
    useCase = new ProcessOutboxEventsUseCase(outboxRepository, outboxEventPublisher);
    const errorSpy = jest
      .spyOn((useCase as unknown as { logger: { error: (msg: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);

    outboxRepository.findPublishable.mockResolvedValue([
      buildEvent({ eventId: 'evt-1' }),
      buildEvent({ eventId: 'evt-2', payload: null as unknown as Record<string, unknown> }),
    ]);
    outboxRepository.claimForPublishing.mockResolvedValue(true);
    outboxEventPublisher.publish.mockRejectedValue(new Error('broker down'));

    // Act
    await useCase.execute({ now: new Date('2026-04-02T10:00:00.000Z') });

    // Assert
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('alert_outbox_publish_repeated_failures='),
    );
  });

  it('limita el backoff exponencial al sexto intento', async () => {
    // Arrange
    const now = new Date('2026-04-02T10:00:00.000Z');
    outboxRepository.findPublishable.mockResolvedValue([
      buildEvent({ eventId: 'evt-capped', retryCount: 10 }),
    ]);
    outboxRepository.claimForPublishing.mockResolvedValue(true);
    outboxEventPublisher.publish.mockRejectedValue(new Error('broker down'));

    // Act
    await useCase.execute({ now, baseRetryDelayMs: 1000 });

    // Assert
    expect(outboxRepository.markFailed).toHaveBeenCalledWith(
      'evt-capped',
      'broker down',
      new Date('2026-04-02T10:00:32.000Z'),
    );
  });
});