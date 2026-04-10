import { CreateTurnoUseCase } from '../../src/application/use-cases/create-turno.use-case';
import { AssignPatientToConsultorioUseCase } from '../../src/application/use-cases/assign-patient-to-consultorio.use-case';
import { ITurnoRepository } from '../../src/domain/ports/ITurnoRepository';
import { IEventPublisher } from '../../src/domain/ports/IEventPublisher';
import { INotificationGateway } from '../../src/domain/ports/INotificationGateway';
import { Turno } from '../../src/domain/entities/turno.entity';

describe('CreateTurnoUseCase (Application)', () => {
    const turnoCreado = new Turno({
        id: 't1',
        nombre: 'Paciente Test',
        cedula: 12345,
        consultorio: null,
        estado: 'espera',
        priority: 'media',
        timestamp: 100,
        finAtencionAt: null,
    });

    const turnoRepository: jest.Mocked<ITurnoRepository> = {
        findActivoPorCedula: jest.fn(),
        save: jest.fn(),
        findPacientesEnEspera: jest.fn(),
        getConsultoriosOcupados: jest.fn(),
        asignarConsultorio: jest.fn(),
        finalizarTurnosLlamados: jest.fn(),
    };

    const eventPublisher: jest.Mocked<IEventPublisher> = {
        publish: jest.fn(),
    };

    const notificationGateway: jest.Mocked<INotificationGateway> = {
        sendNotification: jest.fn(),
    };

    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
        execute: jest.fn(),
    };

    let useCase: CreateTurnoUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateTurnoUseCase(
            turnoRepository,
            eventPublisher,
            notificationGateway,
            assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
        );
    });

    it('crea turno, notifica, publica evento y dispara asignación inmediata', async () => {
        // Arrange: repositorio retorna el turno persistido.
        turnoRepository.findActivoPorCedula.mockResolvedValue(null);
        turnoRepository.save.mockResolvedValue(turnoCreado);
        notificationGateway.sendNotification.mockResolvedValue(undefined);
        (assignPatientToConsultorioUseCase.execute as jest.Mock).mockResolvedValue({
            status: 'noop',
            trigger: 'PatientCreated',
            reason: 'NO_CONSULTORIOS_AVAILABLE',
        });

        // Act: ejecutar creación con datos mínimos válidos.
        const result = await useCase.execute({
            cedula: 12345,
            nombre: 'Paciente Test',
            priority: 'media',
        });

        // Assert: se orquesta toda la cadena del caso de uso.
        expect(turnoRepository.save).toHaveBeenCalledWith({
            cedula: 12345,
            nombre: 'Paciente Test',
            priority: 'media',
        });
        expect(notificationGateway.sendNotification).toHaveBeenCalledWith('12345', null);
        expect(eventPublisher.publish).toHaveBeenCalledWith('turno_creado', turnoCreado.toEventPayload());
        expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('PatientCreated');
        expect(result.turno).toEqual(turnoCreado);
    });

    it('no falla si la asignación inmediata lanza error (best-effort)', async () => {
        // Arrange: creación exitosa pero falla la asignación posterior.
        turnoRepository.findActivoPorCedula.mockResolvedValue(null);
        turnoRepository.save.mockResolvedValue(turnoCreado);
        notificationGateway.sendNotification.mockResolvedValue(undefined);
        (assignPatientToConsultorioUseCase.execute as jest.Mock).mockRejectedValue(new Error('boom'));

        // Act + Assert: el caso de uso sigue retornando el turno creado.
        await expect(
            useCase.execute({ cedula: 12345, nombre: 'Paciente Test', priority: 'media' }),
        ).resolves.toEqual({
            turno: turnoCreado,
            eventPayload: turnoCreado.toEventPayload(),
        });
    });

    it('rechaza creación si la cédula ya tiene un turno activo', async () => {
        // Arrange: ya existe un turno en espera para la cédula.
        turnoRepository.findActivoPorCedula.mockResolvedValue(turnoCreado);

        // Act + Assert: se lanza BadRequest y no se intenta guardar.
        await expect(
            useCase.execute({ cedula: 12345, nombre: 'Paciente Test', priority: 'media' }),
        ).rejects.toThrow('El paciente ya tiene un turno en espera o en atención');
        expect(turnoRepository.save).not.toHaveBeenCalled();
    });
});
