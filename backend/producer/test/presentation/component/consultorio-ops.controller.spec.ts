import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConsultorioOpsController } from '../../../src/presentation/consultorio-ops.controller';
import { GetConsultorioStateUseCase } from '../../../src/application/use-cases/get-consultorio-state.use-case';
import { ReleaseConsultorioCommandUseCase } from '../../../src/application/use-cases/release-consultorio-command.use-case';

describe('ConsultorioOpsController (Presentation)', () => {
  const getConsultorioStateExecute = jest.fn<GetConsultorioStateUseCase['execute']>();
  const getConsultorioStateUseCase: Pick<GetConsultorioStateUseCase, 'execute'> = {
    execute: getConsultorioStateExecute as unknown as GetConsultorioStateUseCase['execute'],
  };

  const releaseConsultorioExecute = jest.fn<ReleaseConsultorioCommandUseCase['execute']>();
  const releaseConsultorioCommandUseCase: Pick<ReleaseConsultorioCommandUseCase, 'execute'> = {
    execute: releaseConsultorioExecute as unknown as ReleaseConsultorioCommandUseCase['execute'],
  };

  let controller: ConsultorioOpsController;

  beforeEach(() => {
    jest.clearAllMocks();

    getConsultorioStateExecute.mockResolvedValue({
      consultorioId: 'C1',
      medicoId: 'DOC-1',
      estado: 'ConMedicoDisponible',
      patientId: null,
      timestamp: 123,
    });

    releaseConsultorioExecute.mockReturnValue({
      status: 'accepted',
      message: 'Comando en proceso: liberar consultorio',
    });

    controller = new ConsultorioOpsController(
      getConsultorioStateUseCase as GetConsultorioStateUseCase,
      releaseConsultorioCommandUseCase as ReleaseConsultorioCommandUseCase,
    );
  });

  it('retorna estado de consultorio para usuario interno autenticado', async () => {
    const req = { authUser: { sub: 'EMP-1' } };

    const result = await controller.getConsultorioState(req as never, 'C1');

    expect(result).toEqual({
      consultorioId: 'C1',
      medicoId: 'DOC-1',
      estado: 'ConMedicoDisponible',
      patientId: null,
      timestamp: 123,
    });
    expect(getConsultorioStateUseCase.execute).toHaveBeenCalledWith('C1');
  });

  it('encola liberacion cuando el consultorio esta ocupado y sin atencion activa', async () => {
    const req = { authUser: { sub: 'EMP-1' } };

    await controller.releaseConsultorioById(req as never, 'C1');

    expect(getConsultorioStateUseCase.execute).toHaveBeenCalledWith('C1');
    expect(releaseConsultorioCommandUseCase.execute).toHaveBeenCalledWith({ doctorId: 'DOC-1' });
  });

  it('retorna respuesta idempotente si el consultorio ya esta libre', async () => {
    const req = { authUser: { sub: 'EMP-1' } };
    getConsultorioStateExecute.mockResolvedValueOnce({
      consultorioId: 'C2',
      medicoId: null,
      estado: 'SinMedico',
      patientId: null,
      timestamp: 321,
    });

    const result = await controller.releaseConsultorioById(req as never, 'C2');

    expect(result).toEqual({
      status: 'accepted',
      message: 'El consultorio ya se encuentra libre',
    });
    expect(releaseConsultorioCommandUseCase.execute).not.toHaveBeenCalled();
  });

  it('rechaza liberacion cuando hay atencion activa', async () => {
    const req = { authUser: { sub: 'EMP-1' } };
    getConsultorioStateExecute.mockResolvedValueOnce({
      consultorioId: 'C3',
      medicoId: 'DOC-3',
      estado: 'EnAtencion',
      patientId: '123',
      timestamp: 456,
    });

    await expect(controller.releaseConsultorioById(req as never, 'C3')).rejects.toThrow(ConflictException);
    expect(releaseConsultorioCommandUseCase.execute).not.toHaveBeenCalled();
  });

  it('rechaza peticion cuando el token no contiene identificador de usuario', async () => {
    const req = { authUser: {} };

    await expect(controller.getConsultorioState(req as never, 'C1')).rejects.toThrow(UnauthorizedException);
    await expect(controller.releaseConsultorioById(req as never, 'C1')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
