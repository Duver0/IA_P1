export type ProcessingErrorKind = 'infrastructure' | 'configuration';

interface MessageProcessingErrorParams {
  message: string;
  code: string;
  recoverable: boolean;
  kind: ProcessingErrorKind;
  context?: Record<string, unknown>;
}

export abstract class MessageProcessingError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly kind: ProcessingErrorKind;
  readonly context?: Record<string, unknown>;

  protected constructor(params: MessageProcessingErrorParams) {
    super(params.message);
    this.name = new.target.name;
    this.code = params.code;
    this.recoverable = params.recoverable;
    this.kind = params.kind;
    this.context = params.context;
  }
}

export class RecoverableInfraError extends MessageProcessingError {
  constructor(message: string, code = 'INFRA_TRANSIENT_FAILURE', context?: Record<string, unknown>) {
    super({
      message,
      code,
      recoverable: true,
      kind: 'infrastructure',
      context,
    });
  }
}

export class NonRecoverableInfraError extends MessageProcessingError {
  constructor(message: string, code = 'INFRA_FATAL_FAILURE', context?: Record<string, unknown>) {
    super({
      message,
      code,
      recoverable: false,
      kind: 'infrastructure',
      context,
    });
  }
}

export class ConfigurationError extends MessageProcessingError {
  constructor(message: string, code = 'CONFIGURATION_ERROR', context?: Record<string, unknown>) {
    super({
      message,
      code,
      recoverable: false,
      kind: 'configuration',
      context,
    });
  }
}