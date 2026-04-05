import { IEventPublisher } from '../../src/domain/ports/IEventPublisher';
import { AssignDoctorToConsultorioCommandUseCase } from '../../src/application/use-cases/assign-doctor-to-consultorio-command.use-case';
import { SetDoctorAvailabilityCommandUseCase } from '../../src/application/use-cases/set-doctor-availability-command.use-case';
import { StartMedicalAttentionCommandUseCase } from '../../src/application/use-cases/start-medical-attention-command.use-case';
import { FinalizeMedicalAttentionCommandUseCase } from '../../src/application/use-cases/finalize-medical-attention-command.use-case';
import { ReleaseConsultorioCommandUseCase } from '../../src/application/use-cases/release-consultorio-command.use-case';

describe('Medical command use cases (Application)', () => {
  const eventPublisher: jest.Mocked<IEventPublisher> = {
    publish: jest.fn(),
  };

  const expectPublishedWithCommandId = (eventName: string, data: Record<string, unknown>): void => {
    expect(eventPublisher.publish).toHaveBeenCalledWith(eventName, expect.objectContaining(data));

    const payload = (eventPublisher.publish as jest.Mock).mock.calls[0]?.[1] as {
      commandId?: unknown;
    };

    expect(typeof payload?.commandId).toBe('string');
    expect((payload?.commandId as string).length).toBeGreaterThan(0);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes asociar_medico_consultorio event', () => {
    const useCase = new AssignDoctorToConsultorioCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1', consultorioId: 'C1' };

    const result = useCase.execute(data);

    expectPublishedWithCommandId('asociar_medico_consultorio', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes cambiar_disponibilidad_medico event', () => {
    const useCase = new SetDoctorAvailabilityCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1', disponible: false };

    const result = useCase.execute(data);

    expectPublishedWithCommandId('cambiar_disponibilidad_medico', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes iniciar_atencion_medica event', () => {
    const useCase = new StartMedicalAttentionCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1', pacienteNombre: 'Ana', pacienteDocumento: '1032' };

    const result = useCase.execute(data);

    expectPublishedWithCommandId('iniciar_atencion_medica', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes finalizar_atencion_medica event', () => {
    const useCase = new FinalizeMedicalAttentionCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1' };

    const result = useCase.execute(data);

    expectPublishedWithCommandId('finalizar_atencion_medica', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes liberar_consultorio event', () => {
    const useCase = new ReleaseConsultorioCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1' };

    const result = useCase.execute(data);

    expectPublishedWithCommandId('liberar_consultorio', data);
    expect(result.status).toBe('accepted');
  });

  it('propagates publisher error', () => {
    const useCase = new AssignDoctorToConsultorioCommandUseCase(eventPublisher);
    const publishError = new Error('broker down');

    eventPublisher.publish.mockImplementationOnce(() => {
      throw publishError;
    });

    expect(() => useCase.execute({ doctorId: 'DOC-1', consultorioId: 'C1' })).toThrow(publishError);
  });

  it('propaga errores al publicar cambiar_disponibilidad_medico', () => {
    const useCase = new SetDoctorAvailabilityCommandUseCase(eventPublisher);
    const publishError = new Error('disponibilidad broker down');

    eventPublisher.publish.mockImplementationOnce(() => {
      throw publishError;
    });

    expect(() => useCase.execute({ doctorId: 'DOC-1', disponible: true })).toThrow(publishError);
  });

  it('propaga errores al publicar iniciar_atencion_medica', () => {
    const useCase = new StartMedicalAttentionCommandUseCase(eventPublisher);
    const publishError = new Error('inicio broker down');

    eventPublisher.publish.mockImplementationOnce(() => {
      throw publishError;
    });

    expect(() =>
      useCase.execute({
        doctorId: 'DOC-1',
        pacienteNombre: 'Ana',
        pacienteDocumento: '1032',
      })
    ).toThrow(publishError);
  });

  it('propaga errores al publicar finalizar_atencion_medica', () => {
    const useCase = new FinalizeMedicalAttentionCommandUseCase(eventPublisher);
    const publishError = new Error('fin broker down');

    eventPublisher.publish.mockImplementationOnce(() => {
      throw publishError;
    });

    expect(() => useCase.execute({ doctorId: 'DOC-1' })).toThrow(publishError);
  });

  it('propaga errores al publicar liberar_consultorio', () => {
    const useCase = new ReleaseConsultorioCommandUseCase(eventPublisher);
    const publishError = new Error('liberar broker down');

    eventPublisher.publish.mockImplementationOnce(() => {
      throw publishError;
    });

    expect(() => useCase.execute({ doctorId: 'DOC-1' })).toThrow(publishError);
  });

  it('propaga valores no Error en comando asociar_medico_consultorio', () => {
    const useCase = new AssignDoctorToConsultorioCommandUseCase(eventPublisher);

    eventPublisher.publish.mockImplementationOnce(() => {
      throw 'broker down string';
    });

    try {
      useCase.execute({ doctorId: 'DOC-1', consultorioId: 'C1' });
      throw new Error('expected throw');
    } catch (error: unknown) {
      expect(error).toBe('broker down string');
    }
  });

  it('propaga valores no Error en comando cambiar_disponibilidad_medico', () => {
    const useCase = new SetDoctorAvailabilityCommandUseCase(eventPublisher);

    eventPublisher.publish.mockImplementationOnce(() => {
      throw 'disponibilidad string error';
    });

    try {
      useCase.execute({ doctorId: 'DOC-1', disponible: false });
      throw new Error('expected throw');
    } catch (error: unknown) {
      expect(error).toBe('disponibilidad string error');
    }
  });

  it('propaga valores no Error en comando iniciar_atencion_medica', () => {
    const useCase = new StartMedicalAttentionCommandUseCase(eventPublisher);

    eventPublisher.publish.mockImplementationOnce(() => {
      throw 'iniciar string error';
    });

    try {
      useCase.execute({
        doctorId: 'DOC-1',
        pacienteNombre: 'Ana',
        pacienteDocumento: '1032',
      });
      throw new Error('expected throw');
    } catch (error: unknown) {
      expect(error).toBe('iniciar string error');
    }
  });

  it('propaga valores no Error en comando finalizar_atencion_medica', () => {
    const useCase = new FinalizeMedicalAttentionCommandUseCase(eventPublisher);

    eventPublisher.publish.mockImplementationOnce(() => {
      throw 'finalizar string error';
    });

    try {
      useCase.execute({ doctorId: 'DOC-1' });
      throw new Error('expected throw');
    } catch (error: unknown) {
      expect(error).toBe('finalizar string error');
    }
  });

  it('propaga valores no Error en comando liberar_consultorio', () => {
    const useCase = new ReleaseConsultorioCommandUseCase(eventPublisher);

    eventPublisher.publish.mockImplementationOnce(() => {
      throw 'liberar string error';
    });

    try {
      useCase.execute({ doctorId: 'DOC-1' });
      throw new Error('expected throw');
    } catch (error: unknown) {
      expect(error).toBe('liberar string error');
    }
  });
});
