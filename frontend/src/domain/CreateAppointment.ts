// ⚕️ HUMAN CHECK - DTO frontend sincronizado con backend
// cedula era string pero el backend lo espera como number. Corregido.
export interface CreateAppointmentDTO {
    nombre: string;
    cedula: number;
    priority?: "alta" | "media" | "baja";
}

// ⚕️ HUMAN CHECK - Respuesta sincronizada con backend (ProducerService)
// El backend retorna status:'accepted', no 'queued'
export interface CreateAppointmentResponse {
    status: "accepted" | "error";
    message: string;
}
