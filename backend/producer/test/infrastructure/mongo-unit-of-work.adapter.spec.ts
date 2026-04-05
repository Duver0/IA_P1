import { MongoUnitOfWorkAdapter } from '../../src/infrastructure/adapters/mongo-unit-of-work.adapter';

describe('MongoUnitOfWorkAdapter (Infrastructure)', () => {
  const connection = {
    startSession: jest.fn(),
  };

  let adapter: MongoUnitOfWorkAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MongoUnitOfWorkAdapter(connection as never);
  });

  it('ejecuta el trabajo dentro de transacción mongo y retorna resultado', async () => {
    const endSession = jest.fn().mockResolvedValue(undefined);
    const withTransaction = jest.fn(async (work: () => Promise<void>) => {
      await work();
    });
    const session = {
      withTransaction,
      endSession,
    };

    connection.startSession.mockResolvedValue(session);

    const result = await adapter.execute(async tx => {
      expect(tx.kind).toBe('mongo');
      expect(tx.value).toBe(session);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('lanza error cuando la transacción finaliza sin resultado', async () => {
    const endSession = jest.fn().mockResolvedValue(undefined);
    const withTransaction = jest.fn(async (work: () => Promise<void>) => {
      await work();
    });
    const session = {
      withTransaction,
      endSession,
    };

    connection.startSession.mockResolvedValue(session);

    await expect(
      adapter.execute(async () => undefined as unknown as string),
    ).rejects.toThrow('La transaccion finalizo sin resultado');
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('propaga errores del trabajo y cierra sesión', async () => {
    const endSession = jest.fn().mockResolvedValue(undefined);
    const withTransaction = jest.fn(async (work: () => Promise<void>) => {
      await work();
    });
    const session = {
      withTransaction,
      endSession,
    };

    connection.startSession.mockResolvedValue(session);

    await expect(
      adapter.execute(async () => {
        throw new Error('work failed');
      }),
    ).rejects.toThrow('work failed');
    expect(endSession).toHaveBeenCalledTimes(1);
  });
});
