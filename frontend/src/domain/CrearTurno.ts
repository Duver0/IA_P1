export interface CrearTurnoDTO {
    nombre: string;
    cedula: string;
}

export interface CrearTurnoResponse {
    status: "queued" | "error";
    message: string;
    timestamp: number;
}
