// ⚕️ HUMAN CHECK - Modelo de dominio sincronizado con backend TurnoEventPayload
// Los tipos de estado y priority son uniones literales, no strings genéricos
export type AppointmentStatus = "espera" | "llamado" | "atendido";
export type AppointmentPriority = "alta" | "media" | "baja";

export interface Appointment {
    id: string;
    nombre: string;
    cedula: number;
    consultorio: string | null;
    timestamp: number;
    estado: AppointmentStatus;
    priority: AppointmentPriority;
}
