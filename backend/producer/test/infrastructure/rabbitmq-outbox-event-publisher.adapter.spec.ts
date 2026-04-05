import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { RabbitMQOutboxEventPublisher } from '../../src/infrastructure/adapters/rabbitmq-outbox-event-publisher.adapter';

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(),
}));

describe('RabbitMQOutboxEventPublisher (Infrastructure)', () => {
  const mockChannel = {
    sendToQueue: jest.fn(),
    close: jest.fn(),
  } as unknown as jest.Mocked<ChannelWrapper>;

  const mockConnection = {
    createChannel: jest.fn(),
    close: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;

  let publisher: RabbitMQOutboxEventPublisher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel.sendToQueue.mockResolvedValue(true);
    mockChannel.close.mockResolvedValue(undefined);
    mockConnection.createChannel.mockReturnValue(mockChannel);
    mockConnection.close.mockResolvedValue(undefined);

    (amqp.connect as jest.Mock).mockReturnValue(mockConnection);
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'RABBITMQ_URL') {
        return 'amqp://guest:guest@rabbitmq:5672';
      }

      if (key === 'RABBITMQ_QUEUE') {
        return defaultValue ?? 'turnos_queue';
      }

      return defaultValue;
    });

    publisher = new RabbitMQOutboxEventPublisher(configService);
  });

  it('publica evento outbox en ClientProxy', async () => {
    // Arrange
    const event = 'usuario_creado';
    const payload = { userId: 'doctor-1' };

    // Act
    await publisher.publish(event, payload);

    // Assert
    expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
      'turnos_queue',
      expect.any(Buffer),
      expect.objectContaining({
        persistent: true,
        contentType: 'application/json',
      }),
    );

    const sentBuffer = (mockChannel.sendToQueue as jest.Mock).mock.calls[0]?.[1] as Buffer;
    expect(JSON.parse(sentBuffer.toString('utf8'))).toEqual({
      pattern: 'usuario_creado',
      data: payload,
    });
  });

  it('declara la cola durable durante setup del canal', async () => {
    const channelConfig = (mockConnection.createChannel as jest.Mock).mock.calls[0]?.[0] as {
      setup: (channel: { assertQueue: jest.Mock }) => Promise<void>;
    };
    const confirmChannel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
    };

    await channelConfig.setup(confirmChannel);

    expect(confirmChannel.assertQueue).toHaveBeenCalledWith('turnos_queue', { durable: true });
  });

  it('propaga error cuando falla emisión al broker', async () => {
    // Arrange
    mockChannel.sendToQueue.mockRejectedValue(new Error('broker down'));

    // Act
    const act = () => publisher.publish('usuario_creado', { userId: 'doctor-1' });

    // Assert
    await expect(act()).rejects.toThrow('broker down');
  });

  it('cierra conexión y canal en onModuleDestroy', async () => {
    // Act
    await publisher.onModuleDestroy();

    // Assert
    expect(mockChannel.close).toHaveBeenCalled();
    expect(mockConnection.close).toHaveBeenCalled();
  });

  it('falla al construir si no existe RABBITMQ_URL', () => {
    // Arrange
    configService.get.mockReturnValue(undefined);

    // Act
    const act = () => new RabbitMQOutboxEventPublisher(configService);

    // Assert
    expect(act).toThrow('RABBITMQ_URL environment variable is required');
  });
});