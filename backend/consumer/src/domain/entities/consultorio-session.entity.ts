export type ConsultorioEstado =
  | 'SinMedico'
  | 'ConMedicoDisponible'
  | 'EnAtencion'
  | 'ConMedicoNoDisponible';

export interface PacienteEnAtencion {
  nombre: string;
  documento: string;
}

export class ConsultorioDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsultorioDomainError';
  }
}

interface ConsultorioSessionProps {
  consultorioId: string;
  medicoId: string | null;
  estado: ConsultorioEstado;
  pacienteEnAtencion: PacienteEnAtencion | null;
  noDisponibleDiferido: boolean;
}

export class ConsultorioSession {
  readonly consultorioId: string;
  readonly medicoId: string | null;
  readonly estado: ConsultorioEstado;
  readonly pacienteEnAtencion: PacienteEnAtencion | null;
  readonly noDisponibleDiferido: boolean;

  constructor(props: ConsultorioSessionProps) {
    this.consultorioId = props.consultorioId;
    this.medicoId = props.medicoId;
    this.estado = props.estado;
    this.pacienteEnAtencion = props.pacienteEnAtencion;
    this.noDisponibleDiferido = props.noDisponibleDiferido;
  }

  static crearSinMedico(consultorioId: string): ConsultorioSession {
    if (!consultorioId.trim()) {
      throw new ConsultorioDomainError('Consultorio inválido');
    }

    return new ConsultorioSession({
      consultorioId,
      medicoId: null,
      estado: 'SinMedico',
      pacienteEnAtencion: null,
      noDisponibleDiferido: false,
    });
  }

  asignarMedico(medicoId: string): ConsultorioSession {
    if (!medicoId.trim()) {
      throw new ConsultorioDomainError('Médico inválido');
    }

    if (this.estado !== 'SinMedico') {
      throw new ConsultorioDomainError('El consultorio ya tiene médico asociado');
    }

    return this.copy({
      medicoId,
      estado: 'ConMedicoDisponible',
      pacienteEnAtencion: null,
      noDisponibleDiferido: false,
    });
  }

  marcarNoDisponible(): ConsultorioSession {
    if (this.estado === 'SinMedico') {
      throw new ConsultorioDomainError('No se puede cambiar disponibilidad sin médico asociado');
    }

    if (this.estado === 'ConMedicoNoDisponible') {
      return this;
    }

    if (this.estado === 'EnAtencion') {
      return this.copy({ noDisponibleDiferido: true });
    }

    return this.copy({
      estado: 'ConMedicoNoDisponible',
      noDisponibleDiferido: false,
    });
  }

  marcarDisponible(): ConsultorioSession {
    if (this.estado === 'SinMedico') {
      throw new ConsultorioDomainError('No se puede cambiar disponibilidad sin médico asociado');
    }

    if (this.estado === 'ConMedicoDisponible') {
      return this;
    }

    if (this.estado === 'EnAtencion') {
      return this.copy({ noDisponibleDiferido: false });
    }

    return this.copy({
      estado: 'ConMedicoDisponible',
      noDisponibleDiferido: false,
    });
  }

  iniciarAtencion(paciente: PacienteEnAtencion): ConsultorioSession {
    if (this.estado !== 'ConMedicoDisponible') {
      throw new ConsultorioDomainError('Solo se puede iniciar atención con médico disponible');
    }

    if (!paciente.nombre.trim() || !paciente.documento.trim()) {
      throw new ConsultorioDomainError('Paciente inválido');
    }

    return this.copy({
      estado: 'EnAtencion',
      pacienteEnAtencion: {
        nombre: paciente.nombre,
        documento: paciente.documento,
      },
      noDisponibleDiferido: false,
    });
  }

  finalizarAtencion(): ConsultorioSession {
    if (this.estado !== 'EnAtencion') {
      throw new ConsultorioDomainError('No hay atención activa para finalizar');
    }

    const proximoEstado: ConsultorioEstado = this.noDisponibleDiferido
      ? 'ConMedicoNoDisponible'
      : 'ConMedicoDisponible';

    return this.copy({
      estado: proximoEstado,
      pacienteEnAtencion: null,
      noDisponibleDiferido: false,
    });
  }

  abandonarConsultorio(): ConsultorioSession {
    if (this.estado === 'SinMedico') {
      throw new ConsultorioDomainError('No hay médico asociado para abandonar el consultorio');
    }

    if (this.estado === 'EnAtencion') {
      throw new ConsultorioDomainError('No se puede abandonar el consultorio con atención activa');
    }

    return ConsultorioSession.crearSinMedico(this.consultorioId);
  }

  puedeRecibirPaciente(): boolean {
    return this.estado === 'ConMedicoDisponible';
  }

  private copy(overrides: Partial<ConsultorioSessionProps>): ConsultorioSession {
    return new ConsultorioSession({
      consultorioId: overrides.consultorioId ?? this.consultorioId,
      medicoId: overrides.medicoId !== undefined ? overrides.medicoId : this.medicoId,
      estado: overrides.estado ?? this.estado,
      pacienteEnAtencion:
        overrides.pacienteEnAtencion !== undefined
          ? overrides.pacienteEnAtencion
          : this.pacienteEnAtencion,
      noDisponibleDiferido:
        overrides.noDisponibleDiferido !== undefined
          ? overrides.noDisponibleDiferido
          : this.noDisponibleDiferido,
    });
  }
}