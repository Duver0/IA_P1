import {
  ProvisionDoctorFromUserUseCase,
  ProvisionDoctorFromUserInput,
} from '../../src/application/use-cases/provision-doctor-from-user.use-case';
import { DomainRuleError } from '../../src/domain/errors/message-processing.error';
import { DoctorRecord, IDoctorRepository } from '../../src/domain/ports/IDoctorRepository';

const buildDoctorRepository = (): jest.Mocked<IDoctorRepository> => ({
  findById: jest.fn(),
  findByConsultorioId: jest.fn(),
  provisionDoctorFromUser: jest.fn(),
  assignConsultorio: jest.fn(),
  releaseConsultorio: jest.fn(),
  setDisponibilidad: jest.fn(),
});

describe('ProvisionDoctorFromUserUseCase (Application)', () => {
  const medicoInput: ProvisionDoctorFromUserInput = {
    commandId: 'cmd-user-created-1',
    userId: 'doctor-1',
    email: 'medico@example.com',
    nombre: 'Dra. Paula',
    rol: 'medico',
  };

  const doctorRecord: DoctorRecord = {
    id: 'doctor-1',
    nombre: 'Dra. Paula',
    email: 'medico@example.com',
    consultorioId: null,
    disponible: true,
  };

  it('crea doctor automaticamente cuando el usuario es medico', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    doctorRepository.provisionDoctorFromUser.mockResolvedValue({
      doctor: doctorRecord,
      created: true,
    });
    const useCase = new ProvisionDoctorFromUserUseCase(doctorRepository);

    // Act
    const result = await useCase.execute(medicoInput);

    // Assert
    expect(result).toEqual({
      status: 'created',
      doctorId: 'doctor-1',
    });
    expect(doctorRepository.provisionDoctorFromUser).toHaveBeenCalledWith({
      userId: 'doctor-1',
      email: 'medico@example.com',
      nombre: 'Dra. Paula',
    });
  });

  it('es idempotente cuando el doctor ya existe por redelivery', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    doctorRepository.provisionDoctorFromUser.mockResolvedValue({
      doctor: doctorRecord,
      created: false,
    });
    const useCase = new ProvisionDoctorFromUserUseCase(doctorRepository);

    // Act
    const result = await useCase.execute(medicoInput);

    // Assert
    expect(result).toEqual({
      status: 'already_exists',
      doctorId: 'doctor-1',
    });
    expect(doctorRepository.provisionDoctorFromUser).toHaveBeenCalledTimes(1);
  });

  it('ignora provisiones para usuarios no medicos', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const useCase = new ProvisionDoctorFromUserUseCase(doctorRepository);

    // Act
    const result = await useCase.execute({
      ...medicoInput,
      rol: 'empleado',
    });

    // Assert
    expect(result).toEqual({
      status: 'ignored',
      doctorId: null,
    });
    expect(doctorRepository.provisionDoctorFromUser).not.toHaveBeenCalled();
  });

  it('falla cuando el payload del evento es invalido', async () => {
    // Arrange
    const doctorRepository = buildDoctorRepository();
    const useCase = new ProvisionDoctorFromUserUseCase(doctorRepository);

    // Act
    const act = () =>
      useCase.execute({
        ...medicoInput,
        userId: '  ',
      });

    // Assert
    await expect(act()).rejects.toThrow(DomainRuleError);
  });
});
