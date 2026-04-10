import { NotFoundException } from '@nestjs/common';
import { TurnoMongooseAdapter } from '../../../src/infrastructure/adapters/turno-mongoose.adapter';

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
        findOne: jest.fn(),
    };

    const mockUserModel = {
        find: jest.fn(),
        findOne: jest.fn(),
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
        mockConsultorioSessionModel.findOne.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        mockUserModel.find.mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
        });
        mockUserModel.findOne.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
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

        it('enriquece medicoNombre al consultar por cédula cuando hay médico asociado', async () => {
            const cedula = 12345;
            const docs = [mockTurnoDoc({ consultorio: 'C9', cedula })];
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(docs),
                }),
            });
            mockConsultorioSessionModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([{ consultorioId: 'C9', medicoId: 'doctor-9' }]),
            });
            mockUserModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([{ _id: 'doctor-9', nombre: 'Dr. Nueve' }]),
            });

            const result = await adapter.findByCedula(cedula);

            expect(result[0].medicoNombre).toBe('Dr. Nueve');
        });
    });

    describe('findDoctorNameByConsultorioId', () => {
        it('retorna null cuando el id de consultorio está vacío', async () => {
            await expect(adapter.findDoctorNameByConsultorioId('   ')).resolves.toBeNull();
            expect(mockConsultorioSessionModel.findOne).not.toHaveBeenCalled();
        });

        it('retorna null cuando no hay sesión activa de consultorio', async () => {
            mockConsultorioSessionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            await expect(adapter.findDoctorNameByConsultorioId('C1')).resolves.toBeNull();
            expect(mockUserModel.findOne).not.toHaveBeenCalled();
        });

        it('retorna null cuando la sesión no tiene médico asignado', async () => {
            mockConsultorioSessionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ consultorioId: 'C1', medicoId: null }),
            });

            await expect(adapter.findDoctorNameByConsultorioId('C1')).resolves.toBeNull();
            expect(mockUserModel.findOne).not.toHaveBeenCalled();
        });

        it('retorna null cuando no encuentra médico para la sesión', async () => {
            mockConsultorioSessionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ consultorioId: 'C1', medicoId: 'doctor-1' }),
            });
            mockUserModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            await expect(adapter.findDoctorNameByConsultorioId('C1')).resolves.toBeNull();
        });

        it('retorna el nombre del médico cuando existe sesión y usuario médico', async () => {
            mockConsultorioSessionModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ consultorioId: 'C1', medicoId: 'doctor-1' }),
            });
            mockUserModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ _id: 'doctor-1', nombre: 'Dra. Laura' }),
            });

            await expect(adapter.findDoctorNameByConsultorioId('C1')).resolves.toBe('Dra. Laura');
            expect(mockUserModel.findOne).toHaveBeenCalledWith({ _id: 'doctor-1', rol: 'medico' });
        });
    });

    describe('resolución de médicos por consultorio', () => {
        it('omite consulta de usuarios cuando no hay doctorIds válidos en sesiones', async () => {
            const docs = [mockTurnoDoc({ consultorio: 'C1' })];
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(docs),
                }),
            });
            mockConsultorioSessionModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([
                    { consultorioId: 'C1', medicoId: null },
                    { consultorioId: 'C1', medicoId: '   ' },
                ]),
            });

            const result = await adapter.findAll();

            expect(result[0].medicoNombre).toBeUndefined();
            expect(mockUserModel.find).not.toHaveBeenCalled();
        });

        it('ignora sesiones sin médico y solo mapea consultorios con doctor válido', async () => {
            const docs = [
                mockTurnoDoc({ _id: 't1', consultorio: 'C1', nombre: 'Paciente 1' }),
                mockTurnoDoc({ _id: 't2', consultorio: 'C2', nombre: 'Paciente 2' }),
            ];
            mockTurnoModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(docs),
                }),
            });
            mockConsultorioSessionModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([
                    { consultorioId: 'C1', medicoId: null },
                    { consultorioId: 'C2', medicoId: 'doctor-2' },
                ]),
            });
            mockUserModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([
                    { _id: 'doctor-2', nombre: 'Dr. Carlos' },
                ]),
            });

            const result = await adapter.findAll();

            expect(result[0].medicoNombre).toBeUndefined();
            expect(result[1].medicoNombre).toBe('Dr. Carlos');
        });
    });
});
