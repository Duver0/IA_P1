import { NotFoundException } from '@nestjs/common';
import { TurnoMongooseAdapter } from '../../src/infrastructure/adapters/turno-mongoose.adapter';

// Mock del documento Mongoose
const mockTurnoDoc = (overrides = {}) => ({
    _id: 'turno-id-1',
    nombre: 'Paciente Test',
    cedula: 12345,
    consultorio: null,
    estado: 'espera',
    priority: 'media',
    timestamp: Date.now(),
    finAtencionAt: null,
    ...overrides,
});

describe('TurnoMongooseAdapter (Infrastructure)', () => {
    const mockTurnoModel = {
        find: jest.fn(),
    };

    const mockConsultorioSessionModel = {
        find: jest.fn(),
    };

    const mockUserModel = {
        find: jest.fn(),
    };

    let adapter: TurnoMongooseAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new TurnoMongooseAdapter(
            mockTurnoModel as any,
            mockConsultorioSessionModel as any,
            mockUserModel as any,
        );

        mockConsultorioSessionModel.find.mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
        });
        mockUserModel.find.mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
        });
    });

    describe('findAll', () => {
        it('retorna todos los turnos ordenados por timestamp', async () => {
            // Arrange
            const docs = [mockTurnoDoc(), mockTurnoDoc({ _id: 'turno-id-2', cedula: 67890 })];
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(docs),
                }),
            });

            // Act
            const result = await adapter.findAll();

            // Assert
            expect(result).toHaveLength(2);
            expect(mockTurnoModel.find).toHaveBeenCalled();
        });

        it('retorna array vacío si no hay turnos', async () => {
            // Arrange
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });

            // Act
            const result = await adapter.findAll();

            // Assert
            expect(result).toHaveLength(0);
        });

        it('incluye medicoNombre cuando existe un medico asociado al consultorio', async () => {
            const docs = [mockTurnoDoc({ consultorio: 'C1', estado: 'llamado' })];
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(docs),
                }),
            });

            mockConsultorioSessionModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([
                    { consultorioId: 'C1', medicoId: 'doctor-1' },
                ]),
            });

            mockUserModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([
                    { _id: 'doctor-1', nombre: 'Dra. Paula Perez' },
                ]),
            });

            const result = await adapter.findAll();

            expect(result[0].medicoNombre).toBe('Dra. Paula Perez');
        });
    });

    describe('findByCedula', () => {
        it('retorna turnos filtrados por cédula', async () => {
            // Arrange
            const cedula = 12345;
            const docs = [mockTurnoDoc({ cedula })];
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(docs),
                }),
            });

            // Act
            const result = await adapter.findByCedula(cedula);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].cedula).toBe(cedula);
            expect(mockTurnoModel.find).toHaveBeenCalledWith({ cedula });
        });

        it('lanza NotFoundException si no hay turnos para la cédula', async () => {
            // Arrange
            const cedula = 99999;
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([]),
                }),
            });

            // Act & Assert
            await expect(adapter.findByCedula(cedula)).rejects.toThrow(NotFoundException);
        });
    });
});
