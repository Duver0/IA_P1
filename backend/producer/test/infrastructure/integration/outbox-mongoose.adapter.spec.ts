import { OutboxMongooseAdapter } from '../../../src/infrastructure/adapters/outbox-mongoose.adapter';
import { OutboxEventToStore } from '../../../src/domain/entities/outbox-event.entity';

describe('OutboxMongooseAdapter (Infrastructure)', () => {
  const mockModel = {
    create: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
  };

  let adapter: OutboxMongooseAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new OutboxMongooseAdapter(mockModel as never);
  });

  const event: OutboxEventToStore = {
    eventId: 'evt-1',
    type: 'usuario_creado',
    aggregateType: 'usuario',
    aggregateId: 'doctor-1',
    payload: { userId: 'doctor-1' },
    createdAt: new Date('2026-04-02T10:00:00.000Z'),
  };

  it('inserta evento pending sin sesión cuando no recibe tx', async () => {
    mockModel.create.mockResolvedValue(undefined);

    await adapter.insert(event);

    expect(mockModel.create).toHaveBeenCalledWith(
      [
        {
          eventId: 'evt-1',
          type: 'usuario_creado',
          aggregateType: 'usuario',
          aggregateId: 'doctor-1',
          payload: { userId: 'doctor-1' },
          status: 'PENDING',
          createdAt: new Date('2026-04-02T10:00:00.000Z'),
          processedAt: null,
          retryCount: 0,
          nextAttemptAt: new Date('2026-04-02T10:00:00.000Z'),
          lastError: null,
          processingAt: null,
        },
      ],
      undefined,
    );
  });

  it('inserta evento usando sesión mongo cuando recibe tx', async () => {
    const mongoSession = { id: 'session-1' };
    mockModel.create.mockResolvedValue(undefined);

    await adapter.insert(event, { kind: 'mongo', value: mongoSession as never });

    expect(mockModel.create).toHaveBeenCalledWith(expect.any(Array), { session: mongoSession });
  });

  it('falla al insertar cuando recibe tx de tipo no soportado', async () => {
    await expect(
      adapter.insert(event, { kind: 'sql' as unknown as 'mongo', value: {} as never }),
    ).rejects.toThrow('Tipo de transaccion no soportado: sql');
  });

  it('retorna eventos publicables mapeados al record de dominio', async () => {
    const docs = [
      {
        eventId: 'evt-1',
        type: 'usuario_creado',
        aggregateType: 'usuario',
        aggregateId: 'doctor-1',
        payload: { userId: 'doctor-1' },
        status: 'PENDING',
        createdAt: new Date('2026-04-02T09:00:00.000Z'),
        processedAt: null,
        retryCount: 0,
        nextAttemptAt: new Date('2026-04-02T09:00:00.000Z'),
        lastError: null,
        processingAt: null,
      },
    ];
    const exec = jest.fn().mockResolvedValue(docs);
    const limit = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ limit });
    mockModel.find.mockReturnValue({ sort });

    const now = new Date('2026-04-02T10:00:00.000Z');
    const result = await adapter.findPublishable(10, now, 5);

    expect(mockModel.find).toHaveBeenCalledWith({
      status: { $in: ['PENDING', 'FAILED'] },
      processingAt: null,
      nextAttemptAt: { $lte: now },
      retryCount: { $lte: 5 },
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(limit).toHaveBeenCalledWith(10);
    expect(result).toEqual(docs);
  });

  it('retorna true cuando claimForPublishing modifica el documento', async () => {
    mockModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await adapter.claimForPublishing('evt-1', new Date('2026-04-02T10:00:00.000Z'));

    expect(result).toBe(true);
  });

  it('retorna false cuando claimForPublishing no modifica documentos', async () => {
    mockModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

    const result = await adapter.claimForPublishing('evt-1', new Date('2026-04-02T10:00:00.000Z'));

    expect(result).toBe(false);
  });

  it('marca evento como processed', async () => {
    const processedAt = new Date('2026-04-02T10:05:00.000Z');

    await adapter.markProcessed('evt-1', processedAt);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { eventId: 'evt-1' },
      {
        $set: {
          status: 'PROCESSED',
          processedAt,
          processingAt: null,
          lastError: null,
        },
      },
    );
  });

  it('marca evento como failed e incrementa retryCount', async () => {
    const nextAttemptAt = new Date('2026-04-02T10:10:00.000Z');

    await adapter.markFailed('evt-1', 'broker down', nextAttemptAt);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { eventId: 'evt-1' },
      {
        $set: {
          status: 'FAILED',
          processingAt: null,
          lastError: 'broker down',
          nextAttemptAt,
        },
        $inc: {
          retryCount: 1,
        },
      },
    );
  });
});
