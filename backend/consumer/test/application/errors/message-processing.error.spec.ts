import {
  ConfigurationError,
  NonRecoverableInfraError,
  RecoverableInfraError,
} from '../../../src/application/errors/message-processing.error';

describe('MessageProcessingError hierarchy (Application)', () => {
  it('RecoverableInfraError usa defaults y conserva contexto', () => {
    const error = new RecoverableInfraError('timeout broker', undefined, { queue: 'crear_turno' });

    expect(error.message).toBe('timeout broker');
    expect(error.code).toBe('INFRA_TRANSIENT_FAILURE');
    expect(error.recoverable).toBe(true);
    expect(error.kind).toBe('infrastructure');
    expect(error.context).toEqual({ queue: 'crear_turno' });
  });

  it('NonRecoverableInfraError permite codigo custom', () => {
    const error = new NonRecoverableInfraError('fatal write error', 'MONGO_FATAL');

    expect(error.code).toBe('MONGO_FATAL');
    expect(error.recoverable).toBe(false);
    expect(error.kind).toBe('infrastructure');
  });

  it('ConfigurationError usa defaults de configuracion', () => {
    const error = new ConfigurationError('missing env');

    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.recoverable).toBe(false);
    expect(error.kind).toBe('configuration');
  });
});
