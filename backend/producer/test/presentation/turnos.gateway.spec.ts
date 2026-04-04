import { TurnosGateway } from '../../src/events/turnos.gateway';
import { ITurnoRepository } from '../../src/domain/ports/ITurnoRepository';
import { Turno } from '../../src/domain/entities/turno.entity';
import { Server, Socket } from 'socket.io';
import { RealtimeEventsBus } from '../../src/events/realtime-events.bus';
import { ConsultorioRealtimeEventPayload } from '../../src/domain/events/consultorio-realtime.event';

describe('TurnosGateway (Presentation - WebSocket)', () => {
    const turno1 = new Turno({
        id: 't1',
        nombre: 'Paciente A',
        cedula: 123,
        consultorio: '1',
        estado: 'llamado',
        priority: 'alta',
        timestamp: 100,
        finAtencionAt: null,
    });

    const turnoRepository: jest.Mocked<ITurnoRepository> = {
        findAll: jest.fn(),
        findByCedula: jest.fn(),
        findDoctorNameByConsultorioId: jest.fn(),
    };

    const mockClient: Partial<Socket> = {
        id: 'client-123',
        emit: jest.fn(),
    };

    const mockServer: Partial<Server> = {
        emit: jest.fn(),
    };

        const realtimeEventsBus: jest.Mocked<Pick<RealtimeEventsBus,
            | 'onTurnoActualizado'
            | 'onConsultorioUpdated'
            | 'onPatientAssigned'
            | 'onAttentionFinished'
            | 'offTurnoActualizado'
            | 'offConsultorioUpdated'
            | 'offPatientAssigned'
            | 'offAttentionFinished'>> = {
                onTurnoActualizado: jest.fn(),
                onConsultorioUpdated: jest.fn(),
                onPatientAssigned: jest.fn(),
                onAttentionFinished: jest.fn(),
                offTurnoActualizado: jest.fn(),
                offConsultorioUpdated: jest.fn(),
                offPatientAssigned: jest.fn(),
                offAttentionFinished: jest.fn(),
        };

    let gateway: TurnosGateway;

    beforeEach(() => {
        jest.clearAllMocks();
        gateway = new TurnosGateway(turnoRepository, realtimeEventsBus as unknown as RealtimeEventsBus);
        gateway.server = mockServer as Server;
    });

    it('registra listeners del bus interno al iniciar modulo', () => {
        gateway.onModuleInit();

        expect(realtimeEventsBus.onTurnoActualizado).toHaveBeenCalledTimes(1);
        expect(realtimeEventsBus.onConsultorioUpdated).toHaveBeenCalledTimes(1);
        expect(realtimeEventsBus.onPatientAssigned).toHaveBeenCalledTimes(1);
        expect(realtimeEventsBus.onAttentionFinished).toHaveBeenCalledTimes(1);
    });

    it('desregistra listeners del bus interno al destruir modulo', () => {
        gateway.onModuleDestroy();

        expect(realtimeEventsBus.offTurnoActualizado).toHaveBeenCalledTimes(1);
        expect(realtimeEventsBus.offConsultorioUpdated).toHaveBeenCalledTimes(1);
        expect(realtimeEventsBus.offPatientAssigned).toHaveBeenCalledTimes(1);
        expect(realtimeEventsBus.offAttentionFinished).toHaveBeenCalledTimes(1);
    });

    it('envía snapshot de turnos al cliente al conectarse', async () => {
        // Arrange: repositorio tiene turnos disponibles.
        turnoRepository.findAll.mockResolvedValue([turno1]);

        // Act: simular conexión de cliente.
        await gateway.handleConnection(mockClient as Socket);

        // Assert: debe enviar snapshot con todos los turnos.
        expect(turnoRepository.findAll).toHaveBeenCalledTimes(1);
        expect(mockClient.emit).toHaveBeenCalledWith('TURNOS_SNAPSHOT', {
            type: 'TURNOS_SNAPSHOT',
            data: [turno1.toEventPayload()],
        });
    });

    it('envía snapshot vacío si no hay turnos', async () => {
        // Arrange: repositorio sin turnos.
        turnoRepository.findAll.mockResolvedValue([]);

        // Act: conexión de cliente.
        await gateway.handleConnection(mockClient as Socket);

        // Assert: debe enviar array vacío.
        expect(mockClient.emit).toHaveBeenCalledWith('TURNOS_SNAPSHOT', {
            type: 'TURNOS_SNAPSHOT',
            data: [],
        });
    });

    it('hace broadcast de actualización a todos los clientes', async () => {
        // Arrange: payload de turno actualizado.
        const payload = turno1.toEventPayload();

        // Act: emitir actualización desde EventsController.
        await gateway.broadcastTurnoActualizado(payload);

        // Assert: debe hacer broadcast sin filtros.
        expect(mockServer.emit).toHaveBeenCalledWith('TURNO_ACTUALIZADO', {
            type: 'TURNO_ACTUALIZADO',
            data: payload,
        });
    });

    it('enriquece medicoNombre cuando el payload no lo trae y hay consultorio', async () => {
        const payload = {
            ...turno1.toEventPayload(),
            consultorio: 'C3',
            medicoNombre: undefined,
        };
        turnoRepository.findDoctorNameByConsultorioId.mockResolvedValue('Dra. Marcela Diaz');

        await gateway.broadcastTurnoActualizado(payload);

        expect(turnoRepository.findDoctorNameByConsultorioId).toHaveBeenCalledWith('C3');
        expect(mockServer.emit).toHaveBeenCalledWith('TURNO_ACTUALIZADO', {
            type: 'TURNO_ACTUALIZADO',
            data: {
                ...payload,
                medicoNombre: 'Dra. Marcela Diaz',
            },
        });
    });

    it('hace broadcast de consultorio_updated', () => {
        const payload: ConsultorioRealtimeEventPayload = {
            consultorioId: 'C1',
            estado: 'ConMedicoDisponible',
            patientId: null,
            timestamp: Date.now(),
        };

        gateway.broadcastConsultorioUpdated(payload);

        expect(mockServer.emit).toHaveBeenCalledWith('consultorio_updated', payload);
    });

    it('hace broadcast de patient_assigned', () => {
        const payload: ConsultorioRealtimeEventPayload = {
            consultorioId: 'C1',
            estado: 'EnAtencion',
            patientId: '12345',
            timestamp: Date.now(),
        };

        gateway.broadcastPatientAssigned(payload);

        expect(mockServer.emit).toHaveBeenCalledWith('patient_assigned', payload);
    });

    it('hace broadcast de attention_finished', () => {
        const payload: ConsultorioRealtimeEventPayload = {
            consultorioId: 'C1',
            estado: 'ConMedicoDisponible',
            patientId: null,
            timestamp: Date.now(),
        };

        gateway.broadcastAttentionFinished(payload);

        expect(mockServer.emit).toHaveBeenCalledWith('attention_finished', payload);
    });

    it('no falla si el repositorio lanza error al conectar cliente', async () => {
        // Arrange: simular falla de base de datos.
        turnoRepository.findAll.mockRejectedValue(new Error('DB connection lost'));

        // Act + Assert: no debe propagar error (loguea internamente).
        await expect(gateway.handleConnection(mockClient as Socket)).resolves.toBeUndefined();
        expect(mockClient.emit).not.toHaveBeenCalled();
    });

    it('maneja desconexión del cliente correctamente', () => {
        // Act: simular desconexión de cliente.
        gateway.handleDisconnect(mockClient as Socket);

        // Assert: no debe lanzar error (solo loguea).
        expect(true).toBe(true);
    });
});
