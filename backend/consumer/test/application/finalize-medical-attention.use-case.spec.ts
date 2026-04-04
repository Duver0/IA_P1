import { FinalizeMedicalAttentionUseCase } from '../../src/application/use-cases/finalize-medical-attention.use-case';
import {
  ConsultorioDomainError,
  ConsultorioSession,
} from '../../src/domain/entities/consultorio-session.entity';
import { IConsultorioSessionRepository } from '../../src/domain/ports/IConsultorioSessionRepository';
import { IEventPublisher } from '../../src/domain/ports/IEventPublisher';
import { IPatientAssignmentTurnoRepository } from '../../src/domain/ports/IPatientAssignmentTurnoRepository';
import { AssignPatientToConsultorioUseCase } from '../../src/application/use-cases/assign-patient-to-consultorio.use-case';
import { Turno } from '../../src/domain/entities/turno.entity';

const buildConsultorioSessionRepository = (): jest.Mocked<IConsultorioSessionRepository> => ({
  findByConsultorioId: jest
    .fn<Promise<ConsultorioSession | null>, [string]>()
    .mockResolvedValue(null),
  findByMedicoId: jest
    .fn<Promise<ConsultorioSession | null>, [string]>()
    .mockResolvedValue(null),
  save: jest
    .fn<Promise<ConsultorioSession>, [ConsultorioSession]>()
    .mockImplementation(async session => session),
});

const buildEventPublisher = (): jest.Mocked<IEventPublisher> => ({
  publish: jest.fn(),
});

const buildPatientAssignmentTurnoRepository = (): jest.Mocked<IPatientAssignmentTurnoRepository> => ({
  assignNextWaitingPatientToConsultorio: jest.fn(),
  markCalledTurnoAsAttended: jest.fn(),
});

const buildCalledTurno = (): Turno =>
  new Turno({
    id: 'turno-1',
    nombre: 'Ana',
    cedula: 10203040,
    consultorio: 'C1',
    estado: 'atendido',
    priority: 'media',
    timestamp: 1,
    finAtencionAt: null,
  });

describe('FinalizeMedicalAttentionUseCase (Application)', () => {
  it('finaliza atencion y vuelve a ConMedicoDisponible si no hay diferido', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        status: 'noop',
        trigger: 'AttentionFinished',
        reason: 'NO_WAITING_PATIENTS',
      }),
    };
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' });
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);
    patientAssignmentTurnoRepository.markCalledTurnoAsAttended.mockResolvedValue(buildCalledTurno());

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1' });

    // Assert
    expect(result.estado).toBe('ConMedicoDisponible');
    expect(result.pacienteEnAtencion).toBeNull();
    expect(patientAssignmentTurnoRepository.markCalledTurnoAsAttended).toHaveBeenCalledWith(
      'C1',
      '10203040',
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      1,
      'turno_actualizado',
      expect.objectContaining({
        id: 'turno-1',
        estado: 'atendido',
      }),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      'attention_finished',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      3,
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(assignPatientToConsultorioUseCase.execute).toHaveBeenCalledWith('AttentionFinished');
  });

  it('finaliza atencion y pasa a ConMedicoNoDisponible cuando hay diferido', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const session = ConsultorioSession.crearSinMedico('C1')
      .asignarMedico('D1')
      .iniciarAtencion({ nombre: 'Ana', documento: '10203040' })
      .marcarNoDisponible();
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const result = await useCase.execute({ doctorId: 'D1' });

    // Assert
    expect(result.estado).toBe('ConMedicoNoDisponible');
    expect(result.pacienteEnAtencion).toBeNull();
    expect(patientAssignmentTurnoRepository.markCalledTurnoAsAttended).toHaveBeenCalledWith(
      'C1',
      '10203040',
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      1,
      'attention_finished',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoNoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      'consultorio_updated',
      expect.objectContaining({
        consultorioId: 'C1',
        medicoId: 'D1',
        estado: 'ConMedicoNoDisponible',
        patientId: null,
        timestamp: expect.any(Number),
      }),
    );
    expect(assignPatientToConsultorioUseCase.execute).not.toHaveBeenCalled();
  });

  it('rechaza finalizacion cuando no hay consultorio asociado', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(null);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza finalizacion cuando no hay atencion activa', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const session = ConsultorioSession.crearSinMedico('C1').asignarMedico('D1');
    consultorioSessionRepository.findByMedicoId.mockResolvedValue(session);

    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: 'D1' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });

  it('rechaza cuando doctorId es vacio', async () => {
    // Arrange
    const consultorioSessionRepository = buildConsultorioSessionRepository();
    const eventPublisher = buildEventPublisher();
    const patientAssignmentTurnoRepository = buildPatientAssignmentTurnoRepository();
    const assignPatientToConsultorioUseCase: Pick<AssignPatientToConsultorioUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const useCase = new FinalizeMedicalAttentionUseCase(
      consultorioSessionRepository,
      eventPublisher,
      patientAssignmentTurnoRepository,
      assignPatientToConsultorioUseCase as AssignPatientToConsultorioUseCase,
    );

    // Act
    const act = () => useCase.execute({ doctorId: '   ' });

    // Assert
    await expect(act()).rejects.toThrow(ConsultorioDomainError);
  });
});