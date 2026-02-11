export interface Turno {
    id: string;
    nombre: string;
    consultorio: string;
    timestamp: number;
    priority?: "alta" | "media" | "baja";
    estado?: "espera" | "llamado" | "atendido";
}
