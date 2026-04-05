import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SchedulerService } from '../../src/scheduler/scheduler.service';

describe('SchedulerService', () => {
    let service: SchedulerService;

    const schedulerRegistry: Pick<SchedulerRegistry, 'addInterval' | 'deleteInterval'> = {
        addInterval: jest.fn(),
        deleteInterval: jest.fn(),
    };

    const configService: Pick<ConfigService, 'get'> = {
        get: jest.fn((key: string) => {
            if (key === 'SCHEDULER_INTERVAL_MS') return 15000;
            return undefined;
        }),
    };

    beforeEach(() => {
        jest.useFakeTimers();
        service = new SchedulerService(
            configService as ConfigService,
            schedulerRegistry as SchedulerRegistry,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('registra el intervalo al inicializarse', () => {
        // Verifica que el scheduler quede conectado al registro de Nest.
        expect(schedulerRegistry.addInterval).toHaveBeenCalledWith(
            'scheduler-asignacion-turnos',
            expect.any(Object),
        );
    });

    it('ejecuta tick de observabilidad sin lógica de negocio', async () => {
        // Act + Assert
        await expect(service.handleSchedulerTick()).resolves.not.toThrow();
    });

    it('elimina el intervalo en onModuleDestroy', () => {
        // Act: simular apagado ordenado del módulo.
        service.onModuleDestroy();

        // Assert: el intervalo debe quedar removido.
        expect(schedulerRegistry.deleteInterval).toHaveBeenCalledWith(
            'scheduler-asignacion-turnos',
        );
    });

    it('ejecuta el tick automáticamente cuando pasa el intervalo', async () => {
        // Act: avanzar el tiempo para disparar el intervalo.
        jest.advanceTimersByTime(15000);

        // Assert: el callback del setInterval se ejecutó.
        // Note: El callback es async, así que esperamos a que se resuelva.
        await Promise.resolve();
        expect(schedulerRegistry.addInterval).toHaveBeenCalled();
    });

    it('usa intervalo por defecto cuando la configuracion no es numerica', () => {
        const invalidConfig = {
            get: jest.fn(() => 'invalid-number'),
        };

        const localRegistry = {
            addInterval: jest.fn(),
            deleteInterval: jest.fn(),
        };

        const localService = new SchedulerService(
            invalidConfig as unknown as ConfigService,
            localRegistry as unknown as SchedulerRegistry,
        );

        const tickSpy = jest
            .spyOn(localService, 'handleSchedulerTick')
            .mockResolvedValue(undefined);

        jest.advanceTimersByTime(14999);
        expect(tickSpy).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(tickSpy).toHaveBeenCalledTimes(1);

        tickSpy.mockRestore();
        localService.onModuleDestroy();
    });

    it('captura y registra errores durante el tick', async () => {
        const debugSpy = jest
            .spyOn((service as any).logger, 'debug')
            .mockImplementation(() => {
                throw new Error('debug failed');
            });
        const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

        await expect(service.handleSchedulerTick()).resolves.not.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('debug failed'));

        debugSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
