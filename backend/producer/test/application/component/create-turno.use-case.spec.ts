import { CreateTurnoUseCase } from '../../../src/application/use-cases/create-turno.use-case';
import { IEventPublisher } from '../../../src/domain/ports/IEventPublisher';

describe('CreateTurnoUseCase (Application)', () => {
    const eventPublisher: jest.Mocked<IEventPublisher> = {
        publish: jest.fn(),
    };

    let useCase: CreateTurnoUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateTurnoUseCase(eventPublisher);
    });

    it('publica evento crear_turno y retorna status accepted', () => {
        // Arrange: datos válidos de entrada.
        const data = { cedula: 123, nombre: 'Paciente Test', priority: 'media' as const };

        // Act: ejecutar el caso de uso.
        const result = useCase.execute(data);

        // Assert: debe publicar el evento y retornar confirmación.
        expect(eventPublisher.publish).toHaveBeenCalledWith('crear_turno', data);
        expect(result).toEqual({
            status: 'accepted',
            message: 'Turno en proceso de asignación',
        });
    });

    it('propaga error si el publisher falla', () => {
        // Arrange: simular falla del broker.
        const publishError = new Error('RabbitMQ connection lost');
        eventPublisher.publish.mockImplementationOnce(() => {
            throw publishError;
        });

        // Act + Assert: el error debe propagarse al caller.
        expect(() => useCase.execute({ cedula: 123, nombre: 'Test' })).toThrow(publishError);
    });

    it('propaga error no-Error y lo loguea como string', () => {
        // Arrange: simular falla con un string en lugar de Error.
        eventPublisher.publish.mockImplementationOnce(() => {
            throw 'connection timeout';
        });

        // Act + Assert: el error string debe propagarse.
        expect(() => useCase.execute({ cedula: 123, nombre: 'Test' })).toThrow('connection timeout');
    });
});
