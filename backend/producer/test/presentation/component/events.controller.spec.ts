import { EventsController } from '../../../src/events/events.controller';
import { TurnoEventPayload } from '../../../src/domain/entities/turno.entity';
import { ConsultorioRealtimeEventPayload } from '../../../src/domain/events/consultorio-realtime.event';
import { RealtimeEventsBus } from '../../../src/events/realtime-events.bus';

describe('EventsController (Presentation)', () => {
        const mockRealtimeEventsBus: jest.Mocked<Pick<RealtimeEventsBus,
            | 'emitTurnoActualizado'
            | 'emitConsultorioUpdated'
            | 'emitPatientAssigned'
            | 'emitAttentionFinished'>> = {
                emitTurnoActualizado: jest.fn(),
                emitConsultorioUpdated: jest.fn(),
                emitPatientAssigned: jest.fn(),
                emitAttentionFinished: jest.fn(),
    };

    let controller: EventsController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new EventsController(mockRealtimeEventsBus as unknown as RealtimeEventsBus);
    });

    const samplePayload: TurnoEventPayload = {
        id: 'turno-123',
        nombre: 'Paciente Test',
        cedula: 12345,
        consultorio: '1',
        estado: 'espera',
        priority: 'media',
        timestamp: Date.now(),
        finAtencionAt: null,
    };

    describe('handleTurnoCreado', () => {
        it('reenvia el evento turno_creado al gateway WebSocket', async () => {
            // Arrange
            const payload = { ...samplePayload };

            // Act
            await controller.handleTurnoCreado(payload);

            // Assert
            expect(mockRealtimeEventsBus.emitTurnoActualizado).toHaveBeenCalledWith(payload);
        });
    });

    describe('handleTurnoActualizado', () => {
        it('reenvia el evento turno_actualizado al gateway WebSocket', async () => {
            // Arrange
            const payload: TurnoEventPayload = {
                ...samplePayload,
                estado: 'llamado',
                consultorio: '2',
            };

            // Act
            await controller.handleTurnoActualizado(payload);

            // Assert
            expect(mockRealtimeEventsBus.emitTurnoActualizado).toHaveBeenCalledWith(payload);
        });
    });

    describe('eventos consultorio realtime', () => {
        const consultorioPayload: ConsultorioRealtimeEventPayload = {
            consultorioId: 'C1',
            estado: 'EnAtencion',
            patientId: '12345',
            timestamp: Date.now(),
        };

        it('reenvia consultorio_updated al bus interno', async () => {
            await controller.handleConsultorioUpdated(consultorioPayload);

            expect(mockRealtimeEventsBus.emitConsultorioUpdated).toHaveBeenCalledWith(consultorioPayload);
        });

        it('reenvia patient_assigned al bus interno', async () => {
            await controller.handlePatientAssigned(consultorioPayload);

            expect(mockRealtimeEventsBus.emitPatientAssigned).toHaveBeenCalledWith(consultorioPayload);
        });

        it('reenvia patient_assigned aunque patientId sea null', async () => {
            const payload: ConsultorioRealtimeEventPayload = {
                ...consultorioPayload,
                patientId: null,
            };

            await controller.handlePatientAssigned(payload);

            expect(mockRealtimeEventsBus.emitPatientAssigned).toHaveBeenCalledWith(payload);
        });

        it('reenvia attention_finished al bus interno', async () => {
            await controller.handleAttentionFinished(consultorioPayload);

            expect(mockRealtimeEventsBus.emitAttentionFinished).toHaveBeenCalledWith(consultorioPayload);
        });
    });
});
