import { GetTurnosByCedulaUseCase } from '../../../src/application/use-cases/get-turnos-by-cedula.use-case';
import { ITurnoRepository } from '../../../src/domain/ports/ITurnoRepository';
import { Turno } from '../../../src/domain/entities/turno.entity';

describe('GetTurnosByCedulaUseCase (Application)', () => {
    const turnoDelPaciente = new Turno({
        id: 't1',
        nombre: 'Paciente 123',
        cedula: 123,
        consultorio: '2',
        estado: 'llamado',
        priority: 'media',
        timestamp: 100,
        finAtencionAt: null,
    });

    const turnoRepository: jest.Mocked<ITurnoRepository> = {
        findAll: jest.fn(),
        findByCedula: jest.fn(),
        findDoctorNameByConsultorioId: jest.fn(),
    };

    let useCase: GetTurnosByCedulaUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new GetTurnosByCedulaUseCase(turnoRepository);
    });

    it('retorna turnos filtrados por cédula', async () => {
        // Arrange: repositorio retorna turnos del paciente.
        turnoRepository.findByCedula.mockResolvedValue([turnoDelPaciente]);

        // Act: ejecutar consulta por cédula específica.
        const result = await useCase.execute(123);

        // Assert: debe filtrar correctamente.
        expect(turnoRepository.findByCedula).toHaveBeenCalledWith(123);
        expect(result).toEqual([turnoDelPaciente.toEventPayload()]);
    });

    it('retorna array vacío cuando no hay turnos para la cédula', async () => {
        // Arrange: repositorio sin turnos para esa cédula.
        turnoRepository.findByCedula.mockResolvedValue([]);

        // Act: consultar cédula sin turnos.
        const result = await useCase.execute(999);

        // Assert: debe retornar array vacío.
        expect(result).toEqual([]);
    });
});
