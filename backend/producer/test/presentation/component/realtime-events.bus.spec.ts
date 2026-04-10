import { TurnoEventPayload } from '../../../src/domain/entities/turno.entity';
import { ConsultorioRealtimeEventPayload } from '../../../src/domain/events/consultorio-realtime.event';
import { RealtimeEventsBus } from '../../../src/events/realtime-events.bus';

describe('RealtimeEventsBus (Events)', () => {
  let bus: RealtimeEventsBus;

  const turnoPayload: TurnoEventPayload = {
    id: 'turno-1',
    nombre: 'Paciente Test',
    cedula: 12345,
    consultorio: 'C1',
    estado: 'espera',
    priority: 'media',
    timestamp: Date.now(),
    finAtencionAt: null,
  };

  const consultorioPayload: ConsultorioRealtimeEventPayload = {
    consultorioId: 'C1',
    estado: 'ConMedicoDisponible',
    patientId: null,
    timestamp: Date.now(),
  };

  beforeEach(() => {
    bus = new RealtimeEventsBus();
  });

  it('emite y escucha turno_actualizado', () => {
    const listener = jest.fn();

    bus.onTurnoActualizado(listener);
    bus.emitTurnoActualizado(turnoPayload);

    expect(listener).toHaveBeenCalledWith(turnoPayload);
  });

  it('remueve listener de turno_actualizado', () => {
    const listener = jest.fn();

    bus.onTurnoActualizado(listener);
    bus.offTurnoActualizado(listener);
    bus.emitTurnoActualizado(turnoPayload);

    expect(listener).not.toHaveBeenCalled();
  });

  it('emite y escucha consultorio_updated', () => {
    const listener = jest.fn();

    bus.onConsultorioUpdated(listener);
    bus.emitConsultorioUpdated(consultorioPayload);

    expect(listener).toHaveBeenCalledWith(consultorioPayload);
  });

  it('remueve listener de consultorio_updated', () => {
    const listener = jest.fn();

    bus.onConsultorioUpdated(listener);
    bus.offConsultorioUpdated(listener);
    bus.emitConsultorioUpdated(consultorioPayload);

    expect(listener).not.toHaveBeenCalled();
  });

  it('emite y escucha patient_assigned', () => {
    const listener = jest.fn();

    bus.onPatientAssigned(listener);
    bus.emitPatientAssigned(consultorioPayload);

    expect(listener).toHaveBeenCalledWith(consultorioPayload);
  });

  it('remueve listener de patient_assigned', () => {
    const listener = jest.fn();

    bus.onPatientAssigned(listener);
    bus.offPatientAssigned(listener);
    bus.emitPatientAssigned(consultorioPayload);

    expect(listener).not.toHaveBeenCalled();
  });

  it('emite y escucha attention_finished', () => {
    const listener = jest.fn();

    bus.onAttentionFinished(listener);
    bus.emitAttentionFinished(consultorioPayload);

    expect(listener).toHaveBeenCalledWith(consultorioPayload);
  });

  it('remueve listener de attention_finished', () => {
    const listener = jest.fn();

    bus.onAttentionFinished(listener);
    bus.offAttentionFinished(listener);
    bus.emitAttentionFinished(consultorioPayload);

    expect(listener).not.toHaveBeenCalled();
  });
});
