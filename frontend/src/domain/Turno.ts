// ⚕️ HUMAN CHECK - Modelo de dominio sincronizado con backend TurnoEventPayload
// Los tipos de estado y priority son uniones literales, no strings genéricos
export type TurnoEstado = "espera" | "llamado" | "atendido";
export type TurnoPriority = "alta" | "media" | "baja";

export interface Turno {
    id: string;
    nombre: string;
    cedula: number;
    consultorio: string | null;
    timestamp: number;
    estado: TurnoEstado;
    priority: TurnoPriority;
}
