import { GetAllTurnosUseCase } from '../../src/application/use-cases/get-all-turnos.use-case';
import { ITurnoRepository } from '../../src/domain/ports/ITurnoRepository';
import { Turno } from '../../src/domain/entities/turno.entity';

describe('GetAllTurnosUseCase (Application)', () => {
    const turno1 = new Turno({
        id: 't1',
        nombre: 'Paciente A',
        cedula: 111,
        consultorio: '1',
        estado: 'llamado',
        priority: 'alta',
        timestamp: 100,
        finAtencionAt: null,
    });

    const turno2 = new Turno({
        id: 't2',
        nombre: 'Paciente B',
        cedula: 222,
        consultorio: null,
        estado: 'espera',
        priority: 'media',
        timestamp: 200,
        finAtencionAt: null,
    });

    const turnoRepository: jest.Mocked<ITurnoRepository> = {
        findAll: jest.fn(),
        findByCedula: jest.fn(),
        findDoctorNameByConsultorioId: jest.fn(),
    };

    let useCase: GetAllTurnosUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new GetAllTurnosUseCase(turnoRepository);
    });

    it('retorna todos los turnos mapeados a payload', async () => {
        // Arrange: repositorio devuelve entidades de dominio.
        turnoRepository.findAll.mockResolvedValue([turno1, turno2]);

        // Act: ejecutar consulta.
        const result = await useCase.execute();

        // Assert: debe mapear cada entidad a evento payload.
        expect(turnoRepository.findAll).toHaveBeenCalledTimes(1);
        expect(result).toEqual([turno1.toEventPayload(), turno2.toEventPayload()]);
    });

    it('retorna array vacío cuando no hay turnos', async () => {
        // Arrange: repositorio sin datos.
        turnoRepository.findAll.mockResolvedValue([]);

        // Act: ejecutar consulta.
        const result = await useCase.execute();

        // Assert: debe retornar array vacío.
        expect(result).toEqual([]);
    });
});
