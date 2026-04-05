import { TurnoMongooseAdapter } from '../../src/infrastructure/adapters/turno-mongoose.adapter';
import { IPrioritySortingStrategy } from '../../src/domain/ports/IPrioritySortingStrategy';
import { Turno } from '../../src/domain/entities/turno.entity';

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
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
});

const buildExistsQuery = (result: unknown = null) => ({
    session: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
});

describe('TurnoMongooseAdapter (Infrastructure)', () => {
    const mockPrioritySorting: jest.Mocked<IPrioritySortingStrategy> = {
        sort: jest.fn((turnos) => turnos),
    };

    const mockModel = {
        findOne: jest.fn(),
        find: jest.fn(),
        exists: jest.fn(),
        findOneAndUpdate: jest.fn(),
        updateMany: jest.fn(),
    };

    let adapter: TurnoMongooseAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        mockModel.exists.mockReturnValue(buildExistsQuery(null));
        adapter = new TurnoMongooseAdapter(mockModel as any, mockPrioritySorting);
    });

    describe('findActivoPorCedula', () => {
        it('retorna turno si existe uno activo para la cédula', async () => {
            // Arrange
            const doc = mockTurnoDoc({ estado: 'espera' });
            mockModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(doc),
            });

            // Act
            const result = await adapter.findActivoPorCedula(12345);

            // Assert
            expect(result).toBeInstanceOf(Turno);
            expect(result?.cedula).toBe(12345);
        });

        it('retorna null si no hay turno activo', async () => {
            // Arrange
            mockModel.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act
            const result = await adapter.findActivoPorCedula(99999);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('save', () => {
        it('crea y guarda un nuevo turno', async () => {
            // Arrange
            const data = { cedula: 12345, nombre: 'Nuevo Paciente', priority: 'alta' as const };
            const savedDoc = mockTurnoDoc({ ...data, _id: 'new-id' });

            // Mock the Model constructor to return a document with save method
            const mockSave = jest.fn().mockResolvedValue(savedDoc);
            (adapter as any).turnoModel = function (docData: any) {
                return { ...savedDoc, ...docData, save: mockSave };
            };

            // Act
            const result = await adapter.save(data);

            // Assert
            expect(result).toBeInstanceOf(Turno);
            expect(mockSave).toHaveBeenCalled();
        });

        it('usa prioridad media cuando no se especifica prioridad', async () => {
            const data = { cedula: 12345, nombre: 'Sin Prioridad' } as const;
            const savedDoc = mockTurnoDoc({ ...data, _id: 'new-id-default', priority: 'media' });
            const mockSave = jest.fn().mockResolvedValue(savedDoc);

            (adapter as any).turnoModel = function (docData: any) {
                return { ...savedDoc, ...docData, save: mockSave };
            };

            const result = await adapter.save(data as any);

            expect(result.priority).toBe('media');
        });
    });

    describe('findPacientesEnEspera', () => {
        it('retorna pacientes ordenados por prioridad', async () => {
            // Arrange
            const docs = [mockTurnoDoc(), mockTurnoDoc({ _id: 'id-2', cedula: 67890 })];
            mockModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue(docs),
            });

            // Act
            const result = await adapter.findPacientesEnEspera();

            // Assert
            expect(result).toHaveLength(2);
            expect(mockPrioritySorting.sort).toHaveBeenCalled();
        });
    });

    describe('getConsultoriosOcupados', () => {
        it('retorna lista de consultorios ocupados', async () => {
            // Arrange
            const docs = [{ consultorio: '1' }, { consultorio: '2' }];
            mockModel.find.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue(docs),
                    }),
                }),
            });

            // Act
            const result = await adapter.getConsultoriosOcupados();

            // Assert
            expect(result).toEqual(['1', '2']);
        });

        it('filtra consultorios null o undefined', async () => {
            // Arrange
            const docs = [{ consultorio: '1' }, { consultorio: null }, { consultorio: undefined }];
            mockModel.find.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue(docs),
                    }),
                }),
            });

            // Act
            const result = await adapter.getConsultoriosOcupados();

            // Assert
            expect(result).toEqual(['1']);
        });
    });

    describe('asignarConsultorio', () => {
        it('asigna consultorio y retorna turno actualizado', async () => {
            // Arrange
            const updatedDoc = mockTurnoDoc({ consultorio: '3', estado: 'llamado' });
            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedDoc),
            });

            // Act
            const result = await adapter.asignarConsultorio('turno-id-1', '3');

            // Assert
            expect(result).toBeInstanceOf(Turno);
            expect(result?.consultorio).toBe('3');
        });

        it('retorna null si el turno no está en espera', async () => {
            // Arrange
            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            // Act
            const result = await adapter.asignarConsultorio('turno-inexistente', '1');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('assignNextWaitingPatientToConsultorio', () => {
        it('asigna el siguiente paciente en espera al consultorio', async () => {
            const existsQuery = buildExistsQuery(null);
            mockModel.exists.mockReturnValue(existsQuery);

            const updatedDoc = mockTurnoDoc({ consultorio: 'C1', estado: 'llamado' });
            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedDoc),
            });

            const result = await adapter.assignNextWaitingPatientToConsultorio('C1');

            expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                { estado: 'espera' },
                {
                    consultorio: 'C1',
                    estado: 'llamado',
                    finAtencionAt: null,
                },
                {
                    new: true,
                    sort: { timestamp: 1, _id: 1 },
                },
            );
            expect(result?.consultorio).toBe('C1');
        });

        it('retorna null cuando ya hay un paciente llamado en el consultorio', async () => {
            const existsQuery = buildExistsQuery({ _id: 'turno-llamado' });
            mockModel.exists.mockReturnValue(existsQuery);

            const result = await adapter.assignNextWaitingPatientToConsultorio('C1');

            expect(result).toBeNull();
            expect(mockModel.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it('retorna null cuando no hay pacientes en espera para asignar', async () => {
            const existsQuery = buildExistsQuery(null);
            mockModel.exists.mockReturnValue(existsQuery);

            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            const result = await adapter.assignNextWaitingPatientToConsultorio('C1');

            expect(result).toBeNull();
        });

        it('incluye session en opciones cuando assignNext se ejecuta en tx mongo', async () => {
            const sessionRef = { id: 'tx-assign-next' };
            const existsQuery = buildExistsQuery(null);
            mockModel.exists.mockReturnValue(existsQuery);

            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockTurnoDoc({ consultorio: 'C1', estado: 'llamado' })),
            });

            await adapter.assignNextWaitingPatientToConsultorio(
                'C1',
                { kind: 'mongo', value: sessionRef } as never,
            );

            expect(existsQuery.session).toHaveBeenCalledWith(sessionRef);

            expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                { estado: 'espera' },
                {
                    consultorio: 'C1',
                    estado: 'llamado',
                    finAtencionAt: null,
                },
                {
                    new: true,
                    sort: { timestamp: 1, _id: 1 },
                    session: sessionRef,
                },
            );
        });

        it('no incluye session cuando tx mongo llega sin value', async () => {
            const existsQuery = buildExistsQuery(null);
            mockModel.exists.mockReturnValue(existsQuery);

            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockTurnoDoc({ consultorio: 'C1', estado: 'llamado' })),
            });

            await adapter.assignNextWaitingPatientToConsultorio(
                'C1',
                { kind: 'mongo', value: null } as never,
            );

            expect(existsQuery.session).not.toHaveBeenCalled();

            expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                { estado: 'espera' },
                {
                    consultorio: 'C1',
                    estado: 'llamado',
                    finAtencionAt: null,
                },
                {
                    new: true,
                    sort: { timestamp: 1, _id: 1 },
                },
            );
        });
    });

    describe('markCalledTurnoAsAttended', () => {
        it('marca como atendido el turno llamado del paciente en el consultorio', async () => {
            const updatedDoc = mockTurnoDoc({ consultorio: 'C1', estado: 'atendido', cedula: 12345 });
            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedDoc),
            });

            const result = await adapter.markCalledTurnoAsAttended('C1', '12345');

            expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    estado: 'llamado',
                    consultorio: 'C1',
                    cedula: 12345,
                },
                {
                    estado: 'atendido',
                },
                {
                    new: true,
                    sort: { timestamp: 1, _id: 1 },
                },
            );
            expect(result?.estado).toBe('atendido');
        });

        it('retorna null cuando el documento no es numerico', async () => {
            const result = await adapter.markCalledTurnoAsAttended('C1', 'abc');

            expect(result).toBeNull();
            expect(mockModel.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it('incluye session cuando markCalled se ejecuta con tx mongo', async () => {
            const sessionRef = { id: 'tx-mark' };
            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockTurnoDoc({ estado: 'atendido' })),
            });

            await adapter.markCalledTurnoAsAttended(
                'C1',
                '12345',
                { kind: 'mongo', value: sessionRef } as never,
            );

            expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
                {
                    estado: 'llamado',
                    consultorio: 'C1',
                    cedula: 12345,
                },
                {
                    estado: 'atendido',
                },
                {
                    new: true,
                    sort: { timestamp: 1, _id: 1 },
                    session: sessionRef,
                },
            );
        });

        it('retorna null cuando no encuentra turno llamado para marcar atendido', async () => {
            mockModel.findOneAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            const result = await adapter.markCalledTurnoAsAttended('C1', '12345');

            expect(result).toBeNull();
        });
    });

    describe('finalizarTurnosLlamados', () => {
        it('finaliza turnos expirados y retorna lista', async () => {
            // Arrange
            const expirados = [mockTurnoDoc({ estado: 'llamado' })];
            mockModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue(expirados),
            });
            mockModel.updateMany.mockReturnValue({
                exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            });

            // Act
            const result = await adapter.finalizarTurnosLlamados();

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].estado).toBe('atendido');
        });

        it('retorna array vacío si no hay turnos expirados', async () => {
            // Arrange
            mockModel.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
            });

            // Act
            const result = await adapter.finalizarTurnosLlamados();

            // Assert
            expect(result).toHaveLength(0);
            expect(mockModel.updateMany).not.toHaveBeenCalled();
        });
    });
});
