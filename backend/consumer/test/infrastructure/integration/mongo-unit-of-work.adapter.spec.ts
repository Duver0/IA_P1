import { MongoUnitOfWorkAdapter } from '../../src/infrastructure/adapters/mongo-unit-of-work.adapter';

describe('MongoUnitOfWorkAdapter (Infrastructure)', () => {
  const mockSession = {
    withTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.startSession.mockResolvedValue(mockSession);
  });

  it('ejecuta trabajo dentro de withTransaction y retorna resultado', async () => {
    // Arrange
    const adapter = new MongoUnitOfWorkAdapter(mockConnection as never);
    mockSession.withTransaction.mockImplementation(async (work: () => Promise<void>) => {
      await work();
    });

    // Act
    const result = await adapter.execute(async tx => {
      expect(tx.kind).toBe('mongo');
      return 'ok';
    });

    // Assert
    expect(result).toBe('ok');
    expect(mockConnection.startSession).toHaveBeenCalledTimes(1);
    expect(mockSession.withTransaction).toHaveBeenCalledTimes(1);
    expect(mockSession.endSession).toHaveBeenCalledTimes(1);
  });

  it('cierra sesion aunque la transaccion falle', async () => {
    // Arrange
    const adapter = new MongoUnitOfWorkAdapter(mockConnection as never);
    const failure = new Error('tx failed');
    mockSession.withTransaction.mockRejectedValue(failure);

    // Act
    const act = () => adapter.execute(async () => 'x');

    // Assert
    await expect(act()).rejects.toThrow(failure);
    expect(mockSession.endSession).toHaveBeenCalledTimes(1);
  });

  it('lanza error cuando la transaccion termina sin resultado', async () => {
    // Arrange
    const adapter = new MongoUnitOfWorkAdapter(mockConnection as never);
    mockSession.withTransaction.mockImplementation(async (work: () => Promise<void>) => {
      await work();
    });

    // Act
    const act = () =>
      adapter.execute(async () => {
        return undefined as never;
      });

    // Assert
    await expect(act()).rejects.toThrow('La transaccion finalizo sin resultado');
    expect(mockSession.endSession).toHaveBeenCalledTimes(1);
  });
});
