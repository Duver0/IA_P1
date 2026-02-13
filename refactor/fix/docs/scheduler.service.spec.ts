import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { TurnosService } from '../turnos/turnos.service';

// 📂 SHOULD BE LOCATED AT: backend/consumer/src/scheduler/scheduler.service.spec.ts

describe('SchedulerService', () => {
    let service: SchedulerService;
    let turnosService: TurnosService;

    const mockTurnosService = {
        finalizarTurnosLlamados: jest.fn(),
        getConsultoriosOcupados: jest.fn(),
        findPacientesEnEspera: jest.fn(),
        asignarConsultorio: jest.fn(),
        toEventPayload: jest.fn(),
    };

    const mockNotificationsClient = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: TurnosService, useValue: mockTurnosService },
                { provide: 'TURNOS_NOTIFICATIONS', useValue: mockNotificationsClient },
            ],
        }).compile();

        service = module.get<SchedulerService>(SchedulerService);
        turnosService = module.get<TurnosService>(TurnosService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleSchedulerTick', () => {
        it('should assign a consultorio if there are waiting patients and free consultorios', async () => {
            // Setup
            mockTurnosService.finalizarTurnosLlamados.mockResolvedValue([]);
            mockTurnosService.getConsultoriosOcupados.mockResolvedValue(['1', '2']); // 5 total, 3 free
            mockTurnosService.findPacientesEnEspera.mockResolvedValue([{ _id: 'turno1', nombre: 'Test' }]);
            mockTurnosService.asignarConsultorio.mockResolvedValue({ 
                _id: 'turno1', 
                nombre: 'Test', 
                consultorio: '3' 
            });

            // Execute
            await service.handleSchedulerTick();

            // Verify
            expect(mockTurnosService.asignarConsultorio).toHaveBeenCalledWith('turno1', '3');
            expect(mockNotificationsClient.emit).toHaveBeenCalledWith('turno_actualizado', expect.anything());
        });

        it('should do nothing if no consultorios are free', async () => {
            // Setup
            mockTurnosService.finalizarTurnosLlamados.mockResolvedValue([]);
            mockTurnosService.getConsultoriosOcupados.mockResolvedValue(['1', '2', '3', '4', '5']); // All 5 occupied

            // Execute
            await service.handleSchedulerTick();

            // Verify
            expect(mockTurnosService.findPacientesEnEspera).not.toHaveBeenCalled();
            expect(mockTurnosService.asignarConsultorio).not.toHaveBeenCalled();
        });
    });
});
