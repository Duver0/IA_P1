export type TurnoEstado = 'espera' | 'llamado' | 'atendido';
export type TurnoPriority = 'alta' | 'media' | 'baja';

export class Turno {
    readonly id: string;
    readonly nombre: string;
    readonly cedula: number;
    readonly consultorio: string | null;
    readonly medicoNombre?: string;
    readonly estado: TurnoEstado;
    readonly priority: TurnoPriority;
    readonly timestamp: number;
    readonly finAtencionAt: number | null;

    constructor(props: {
        id: string;
        nombre: string;
        cedula: number;
        consultorio: string | null;
        medicoNombre?: string;
        estado: TurnoEstado;
        priority: TurnoPriority;
        timestamp: number;
        finAtencionAt?: number | null;
    }) {
        this.id = props.id;
        this.nombre = props.nombre;
        this.cedula = props.cedula;
        this.consultorio = props.consultorio;
        this.medicoNombre = props.medicoNombre;
        this.estado = props.estado;
        this.priority = props.priority;
        this.timestamp = props.timestamp;
        this.finAtencionAt = props.finAtencionAt ?? null;
    }

    toEventPayload(): TurnoEventPayload {
        return {
            id: this.id,
            nombre: this.nombre,
            cedula: this.cedula,
            consultorio: this.consultorio,
            ...(this.medicoNombre !== undefined && { medicoNombre: this.medicoNombre }),
            estado: this.estado,
            priority: this.priority,
            timestamp: this.timestamp,
            ...(this.finAtencionAt != null && { finAtencionAt: this.finAtencionAt }),
        };
    }
}

export interface TurnoEventPayload {
    id: string;
    nombre: string;
    cedula: number;
    consultorio: string | null;
    medicoNombre?: string;
    estado: TurnoEstado;
    priority: TurnoPriority;
    timestamp: number;
    finAtencionAt?: number;
}
