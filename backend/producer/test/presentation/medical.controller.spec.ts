import { UnauthorizedException } from '@nestjs/common';
import { MedicalController } from '../../src/presentation/medical.controller';
import { AssignDoctorToConsultorioCommandUseCase } from '../../src/application/use-cases/assign-doctor-to-consultorio-command.use-case';
import { SetDoctorAvailabilityCommandUseCase } from '../../src/application/use-cases/set-doctor-availability-command.use-case';
import { StartMedicalAttentionCommandUseCase } from '../../src/application/use-cases/start-medical-attention-command.use-case';
import { FinalizeMedicalAttentionCommandUseCase } from '../../src/application/use-cases/finalize-medical-attention-command.use-case';
import { ReleaseConsultorioCommandUseCase } from '../../src/application/use-cases/release-consultorio-command.use-case';
import { GetConsultorioStateUseCase } from '../../src/application/use-cases/get-consultorio-state.use-case';

describe('MedicalController (Presentation)', () => {
  const assignDoctorToConsultorioCommandUseCase: Pick<AssignDoctorToConsultorioCommandUseCase, 'execute'> = {
    execute: jest.fn(),
  };
  const setDoctorAvailabilityCommandUseCase: Pick<SetDoctorAvailabilityCommandUseCase, 'execute'> = {
    execute: jest.fn(),
  };
  const startMedicalAttentionCommandUseCase: Pick<StartMedicalAttentionCommandUseCase, 'execute'> = {
    execute: jest.fn(),
  };
  const finalizeMedicalAttentionCommandUseCase: Pick<FinalizeMedicalAttentionCommandUseCase, 'execute'> = {
    execute: jest.fn(),
  };
  const releaseConsultorioCommandUseCase: Pick<ReleaseConsultorioCommandUseCase, 'execute'> = {
    execute: jest.fn(),
  };
  const getConsultorioStateUseCase: Pick<GetConsultorioStateUseCase, 'execute'> = {
    execute: jest.fn(),
  };

  let controller: MedicalController;

  beforeEach(() => {
    jest.clearAllMocks();

    (assignDoctorToConsultorioCommandUseCase.execute as jest.Mock).mockReturnValue({ status: 'accepted', message: 'ok' });
    (setDoctorAvailabilityCommandUseCase.execute as jest.Mock).mockReturnValue({ status: 'accepted', message: 'ok' });
    (startMedicalAttentionCommandUseCase.execute as jest.Mock).mockReturnValue({ status: 'accepted', message: 'ok' });
    (finalizeMedicalAttentionCommandUseCase.execute as jest.Mock).mockReturnValue({ status: 'accepted', message: 'ok' });
    (releaseConsultorioCommandUseCase.execute as jest.Mock).mockReturnValue({ status: 'accepted', message: 'ok' });
    (getConsultorioStateUseCase.execute as jest.Mock).mockResolvedValue({
      consultorioId: 'C1',
      estado: 'ConMedicoDisponible',
      patientId: null,
      timestamp: 123,
    });

    controller = new MedicalController(
      assignDoctorToConsultorioCommandUseCase as AssignDoctorToConsultorioCommandUseCase,
      setDoctorAvailabilityCommandUseCase as SetDoctorAvailabilityCommandUseCase,
      startMedicalAttentionCommandUseCase as StartMedicalAttentionCommandUseCase,
      finalizeMedicalAttentionCommandUseCase as FinalizeMedicalAttentionCommandUseCase,
      releaseConsultorioCommandUseCase as ReleaseConsultorioCommandUseCase,
      getConsultorioStateUseCase as GetConsultorioStateUseCase,
    );
  });

  it('enqueues assign consultorio command for authenticated doctor', async () => {
    const req = { authUser: { sub: 'DOC-1' } };

    await controller.assignConsultorio(req as never, { consultorioId: 'C1' });

    expect(assignDoctorToConsultorioCommandUseCase.execute).toHaveBeenCalledWith({
      doctorId: 'DOC-1',
      consultorioId: 'C1',
    });
  });

  it('enqueues set disponibilidad command for authenticated doctor', async () => {
    const req = { authUser: { sub: 'DOC-1' } };

    await controller.setDisponibilidad(req as never, { disponible: false });

    expect(setDoctorAvailabilityCommandUseCase.execute).toHaveBeenCalledWith({
      doctorId: 'DOC-1',
      disponible: false,
    });
  });

  it('enqueues start attention command with patient payload', async () => {
    const req = { authUser: { sub: 'DOC-1' } };

    await controller.startAttention(req as never, {
      pacienteNombre: 'Ana',
      pacienteDocumento: '1032',
    });

    expect(startMedicalAttentionCommandUseCase.execute).toHaveBeenCalledWith({
      doctorId: 'DOC-1',
      pacienteNombre: 'Ana',
      pacienteDocumento: '1032',
    });
  });

  it('enqueues finalize attention command for authenticated doctor', async () => {
    const req = { authUser: { sub: 'DOC-1' } };

    await controller.finalizeAttention(req as never);

    expect(finalizeMedicalAttentionCommandUseCase.execute).toHaveBeenCalledWith({
      doctorId: 'DOC-1',
    });
  });

  it('enqueues release consultorio command for authenticated doctor', async () => {
    const req = { authUser: { sub: 'DOC-1' } };

    await controller.releaseConsultorio(req as never);

    expect(releaseConsultorioCommandUseCase.execute).toHaveBeenCalledWith({
      doctorId: 'DOC-1',
    });
  });

  it('returns consultorio state for authenticated doctor', async () => {
    const req = { authUser: { sub: 'DOC-1' } };

    const result = await controller.getConsultorioState(req as never, 'C1');

    expect(result).toEqual({
      consultorioId: 'C1',
      estado: 'ConMedicoDisponible',
      patientId: null,
      timestamp: 123,
    });
    expect(getConsultorioStateUseCase.execute).toHaveBeenCalledWith('C1');
  });

  it('rejects command when token payload has no doctor id', async () => {
    const req = { authUser: {} };

    await expect(controller.finalizeAttention(req as never)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects command when token payload has blank doctor id', async () => {
    const req = { authUser: { sub: '   ' } };

    await expect(controller.finalizeAttention(req as never)).rejects.toThrow(UnauthorizedException);
  });
});
