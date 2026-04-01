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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes asociar_medico_consultorio event', () => {
    const useCase = new AssignDoctorToConsultorioCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1', consultorioId: 'C1' };

    const result = useCase.execute(data);

    expect(eventPublisher.publish).toHaveBeenCalledWith('asociar_medico_consultorio', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes cambiar_disponibilidad_medico event', () => {
    const useCase = new SetDoctorAvailabilityCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1', disponible: false };

    const result = useCase.execute(data);

    expect(eventPublisher.publish).toHaveBeenCalledWith('cambiar_disponibilidad_medico', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes iniciar_atencion_medica event', () => {
    const useCase = new StartMedicalAttentionCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1', pacienteNombre: 'Ana', pacienteDocumento: '1032' };

    const result = useCase.execute(data);

    expect(eventPublisher.publish).toHaveBeenCalledWith('iniciar_atencion_medica', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes finalizar_atencion_medica event', () => {
    const useCase = new FinalizeMedicalAttentionCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1' };

    const result = useCase.execute(data);

    expect(eventPublisher.publish).toHaveBeenCalledWith('finalizar_atencion_medica', data);
    expect(result.status).toBe('accepted');
  });

  it('publishes liberar_consultorio event', () => {
    const useCase = new ReleaseConsultorioCommandUseCase(eventPublisher);
    const data = { doctorId: 'DOC-1' };

    const result = useCase.execute(data);

    expect(eventPublisher.publish).toHaveBeenCalledWith('liberar_consultorio', data);
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
});
