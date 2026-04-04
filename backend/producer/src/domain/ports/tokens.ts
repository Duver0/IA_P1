// ⚕️ HUMAN CHECK - Tokens de inyección para puertos de dominio
// Usados en los módulos de NestJS para registrar adapters concretos
// y en Use Cases/Services para inyectar las abstracciones

export const TURNO_REPOSITORY_TOKEN = 'ITurnoRepository';
export const EVENT_PUBLISHER_TOKEN = 'IEventPublisher';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';
export const PASSWORD_HASHER_TOKEN = 'IPasswordHasher';
export const TOKEN_SERVICE_TOKEN = 'ITokenService';
export const ACCESS_TOKEN_VERIFIER_TOKEN = 'IAccessTokenVerifier';
export const OUTBOX_REPOSITORY_TOKEN = 'IOutboxRepository';
export const OUTBOX_EVENT_PUBLISHER_TOKEN = 'IOutboxEventPublisher';
export const UNIT_OF_WORK_TOKEN = 'IUnitOfWork';
export const CONSULTORIO_STATE_READER_TOKEN = 'IConsultorioStateReader';
export const TURNOS_SERVICE_TOKEN = 'TURNOS_SERVICE';
