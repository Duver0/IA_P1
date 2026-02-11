// ⚕️ HUMAN CHECK - Tipos compartidos del dominio Turno
// Estos tipos centralizan la definición de estados, prioridades y payloads
// para evitar duplicación y garantizar type safety entre servicios

/**
 * Estados válidos del ciclo de vida de un turno
 */
export type TurnoEstado = 'espera' | 'llamado' | 'atendido';

/**
 * Prioridades válidas para la asignación de consultorios
 */
export type TurnoPriority = 'alta' | 'media' | 'baja';

/**
 * Payload estandarizado para eventos RabbitMQ y WebSocket.
 * Usado por: Consumer (emit), Producer (receive + broadcast), Frontend (receive).
 */
export interface TurnoEventPayload {
    id: string;
    nombre: string;
    cedula: number;
    consultorio: string | null;
    estado: TurnoEstado;
    priority: TurnoPriority;
    timestamp: number;
    finAtencionAt?: number;
}
