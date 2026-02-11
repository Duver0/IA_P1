// ⚕️ HUMAN CHECK - DTO frontend sincronizado con backend
// cedula era string pero el backend lo espera como number. Corregido.
export interface CrearTurnoDTO {
    nombre: string;
    cedula: number;
    priority?: "alta" | "media" | "baja";
}

// ⚕️ HUMAN CHECK - Respuesta sincronizada con backend (ProducerService)
// El backend retorna status:'accepted', no 'queued'
export interface CrearTurnoResponse {
    status: "accepted" | "error";
    message: string;
}
