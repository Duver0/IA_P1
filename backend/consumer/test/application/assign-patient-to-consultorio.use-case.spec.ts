import { AssignPatientToConsultorioUseCase } from '../../src/application/use-cases/assign-patient-to-consultorio.use-case';
import { Turno } from '../../src/domain/entities/turno.entity';
import { ConsultorioSession } from '../../src/domain/entities/consultorio-session.entity';
import { IEventPublisher } from '../../src/domain/ports/IEventPublisher';
import { IUnitOfWork, TransactionContext } from '../../src/domain/ports/IUnitOfWork';
import { IPatientAssignmentTurnoRepository } from '../../src/domain/ports/IPatientAssignmentTurnoRepository';
import { IConsultorioAvailabilityRepository } from '../../src/domain/ports/IConsultorioAvailabilityRepository';

const buildTurno = (): Turno =>
  new Turno({
    id: 't-1',
    nombre: 'Paciente Uno',
    cedula: 1010,
    consultorio: 'C1',
    estado: 'llamado',
    priority: 'media',
    timestamp: 100,
    finAtencionAt: null,
  });

const buildAvailableConsultorio = (): ConsultorioSession =>
  ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');

describe('AssignPatientToConsultorioUseCase (Application)', () => {
  const patientAssignmentTurnoRepository: jest.Mocked<IPatientAssignmentTurnoRepository> = {
    assignNextWaitingPatientToConsultorio: jest.fn(),
    markCalledTurnoAsAttended: jest.fn(),
  };

  const consultorioAvailabilityRepository: jest.Mocked<IConsultorioAvailabilityRepository> = {
    findNextAvailable: jest.fn(),
    reserveIfAvailable: jest.fn(),
  };

  const execute = jest.fn(async (work: (tx: TransactionContext) => Promise<unknown>) =>
    work({ kind: 'mongo', value: { session: 'mock-session' } }),
  );

  const unitOfWork: IUnitOfWork & { execute: jest.Mock } = {
    execute: execute as unknown as IUnitOfWork['execute'] & jest.Mock,
  };

  const eventPublisher: jest.Mocked<IEventPublisher> = {
    publish: jest.fn(),
  };

  let useCase: AssignPatientToConsultorioUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AssignPatientToConsultorioUseCase(
      patientAssignmentTurnoRepository,
      consultorioAvailabilityRepository,
      unitOfWork,
      eventPublisher,
    );
  });

  it('asigna paciente cuando hay espera y consultorio disponible', async () => {
    // Arrange
    const turno = buildTurno();
    consultorioAvailabilityRepository.findNextAvailable.mockResolvedValue(buildAvailableConsultorio());
    patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio.mockResolvedValue(turno);
    consultorioAvailabilityRepository.reserveIfAvailable.mockResolvedValue(
      buildAvailableConsultorio(),
    );

    // Act
    const result = await useCase.execute('PatientCreated');

    // Assert
    expect(result.status).toBe('assigned');
    expect(result.turno?.id).toBe('t-1');
    expect(result.consultorioId).toBe('C1');
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(1, 'turno_actualizado', turno.toEventPayload());
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      'patient_assigned',
      expect.objectContaining({
        consultorioId: 'C1',
        estado: 'ConMedicoDisponible',
        patientId: '1010',
        timestamp: expect.any(Number),
      }),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      3,
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        estado: 'ConMedicoDisponible',
        patientId: '1010',
        timestamp: expect.any(Number),
      }),
    );
    expect(patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio).toHaveBeenCalledWith(
      'C1',
      expect.any(Object),
    );
  });

  it('retorna noop cuando no hay consultorios disponibles', async () => {
    // Arrange
    consultorioAvailabilityRepository.findNextAvailable.mockResolvedValue(null);

    // Act
    const result = await useCase.execute('PatientCreated');

    // Assert
    expect(result).toEqual({
      status: 'noop',
      trigger: 'PatientCreated',
      reason: 'NO_CONSULTORIOS_AVAILABLE',
      consultorioId: undefined,
    });
    expect(patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('bloquea la asignación cuando ningún médico está disponible para recibir paciente', async () => {
    // Arrange
    consultorioAvailabilityRepository.findNextAvailable.mockResolvedValue(null);

    // Act
    const result = await useCase.execute('DoctorBecameAvailable');

    // Assert
    expect(result).toEqual({
      status: 'noop',
      trigger: 'DoctorBecameAvailable',
      reason: 'NO_CONSULTORIOS_AVAILABLE',
      consultorioId: undefined,
    });
    expect(patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('retorna noop cuando no hay pacientes en espera', async () => {
    // Arrange
    consultorioAvailabilityRepository.findNextAvailable.mockResolvedValue(buildAvailableConsultorio());
    patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio.mockResolvedValue(null);

    // Act
    const result = await useCase.execute('DoctorBecameAvailable');

    // Assert
    expect(result).toEqual({
      status: 'noop',
      trigger: 'DoctorBecameAvailable',
      reason: 'NO_WAITING_PATIENTS',
      consultorioId: 'C1',
    });
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('retorna noop por concurrencia cuando el consultorio deja de estar disponible', async () => {
    // Arrange
    const turno = buildTurno();
    consultorioAvailabilityRepository.findNextAvailable.mockResolvedValue(buildAvailableConsultorio());
    patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio.mockResolvedValue(turno);
    consultorioAvailabilityRepository.reserveIfAvailable.mockResolvedValue(null);

    // Act
    const result = await useCase.execute('AttentionFinished');

    // Assert
    expect(result).toEqual({
      status: 'noop',
      trigger: 'AttentionFinished',
      reason: 'CONCURRENCY_CONFLICT',
    });
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('usa trigger Unknown cuando execute se invoca sin parametro', async () => {
    // Arrange
    consultorioAvailabilityRepository.findNextAvailable.mockResolvedValue(null);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toEqual({
      status: 'noop',
      trigger: 'Unknown',
      reason: 'NO_CONSULTORIOS_AVAILABLE',
      consultorioId: undefined,
    });
  });

  it('aplica fallback de payload realtime cuando consultorio actualizado llega incompleto', async () => {
    // Arrange
    const turno = buildTurno();
    consultorioAvailabilityRepository.findNextAvailable.mockResolvedValue(buildAvailableConsultorio());
    patientAssignmentTurnoRepository.assignNextWaitingPatientToConsultorio.mockResolvedValue(turno);
    consultorioAvailabilityRepository.reserveIfAvailable.mockResolvedValue({
      consultorioId: undefined,
      medicoId: undefined,
      estado: undefined,
    } as unknown as ConsultorioSession);

    // Act
    const result = await useCase.execute('PatientCreated');

    // Assert
    expect(result.status).toBe('assigned');
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      'patient_assigned',
      expect.objectContaining({
        consultorioId: 'N/A',
        medicoId: null,
        estado: 'ConMedicoDisponible',
        patientId: '1010',
      }),
    );
  });
});
