import { ConsultorioStateMongooseAdapter } from '../../../src/infrastructure/adapters/consultorio-state-mongoose.adapter';

describe('ConsultorioStateMongooseAdapter (Infrastructure)', () => {
  const mockModel = {
    findOne: jest.fn(),
  };

  const mockUserModel = {
    findOne: jest.fn(),
  };

  let adapter: ConsultorioStateMongooseAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ConsultorioStateMongooseAdapter(
      mockModel as never,
      mockUserModel as never,
    );
  });

  it('retorna null cuando no existe sesión para el consultorio', async () => {
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const result = await adapter.findByConsultorioId('C1');

    expect(mockModel.findOne).toHaveBeenCalledWith({ consultorioId: 'C1' });
    expect(mockUserModel.findOne).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('mapea estado del consultorio cuando existe documento con updatedAt válido', async () => {
    const updatedAt = new Date('2026-04-02T10:00:00.000Z');
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        consultorioId: 'C1',
        medicoId: 'doctor-1',
        estado: 'EnAtencion',
        pacienteEnAtencion: { documento: '12345' },
        updatedAt,
      }),
    });
    mockUserModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ nombre: 'Dra. Demo' }),
        }),
      }),
    });

    const result = await adapter.findByConsultorioId('C1');

    expect(result).toEqual({
      consultorioId: 'C1',
      medicoId: 'doctor-1',
      medicoNombre: 'Dra. Demo',
      estado: 'EnAtencion',
      patientId: '12345',
      timestamp: updatedAt.getTime(),
    });
  });

  it('usa defaults cuando faltan medico/paciente y updatedAt no es Date', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    mockModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        consultorioId: 'C2',
        medicoId: null,
        estado: 'ConMedicoDisponible',
        pacienteEnAtencion: null,
        updatedAt: 'invalid-date',
      }),
    });

    const result = await adapter.findByConsultorioId('C2');

    expect(result).toEqual({
      consultorioId: 'C2',
      medicoId: null,
      medicoNombre: null,
      estado: 'ConMedicoDisponible',
      patientId: null,
      timestamp: 1234567890,
    });

    nowSpy.mockRestore();
  });
});
