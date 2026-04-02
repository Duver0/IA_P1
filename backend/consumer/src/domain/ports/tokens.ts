// ⚕️ HUMAN CHECK - Tokens de inyección para puertos de dominio
// Usados en los módulos de NestJS para registrar adapters concretos
// y en Use Cases/Services para inyectar las abstracciones

export const TURNO_REPOSITORY_TOKEN = 'ITurnoRepository';
export const EVENT_PUBLISHER_TOKEN = 'IEventPublisher';
export const NOTIFICATION_GATEWAY_TOKEN = 'INotificationGateway';
export const PRIORITY_SORTING_STRATEGY_TOKEN = 'IPrioritySortingStrategy';
export const DOCTOR_REPOSITORY_TOKEN = 'IDoctorRepository';
export const CONSULTORIO_SESSION_REPOSITORY_TOKEN = 'IConsultorioSessionRepository';
export const UNIT_OF_WORK_TOKEN = 'IUnitOfWork';
export const PROCESSED_MEDICAL_COMMAND_REPOSITORY_TOKEN = 'IProcessedMedicalCommandRepository';
