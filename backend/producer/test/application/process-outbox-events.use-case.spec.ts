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
  let outboxRepository: jest.Mocked<IOutboxRepository>;
  let outboxEventPublisher: jest.Mocked<IOutboxEventPublisher>;
  let useCase: ProcessOutboxEventsUseCase;

  beforeEach(() => {
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
});