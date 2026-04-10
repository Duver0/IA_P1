export const USER_CREATED_EVENT = 'usuario_creado';

export interface UserCreatedEventPayload {
  commandId: string;
  eventVersion: number;
  userId: string;
  email: string;
  nombre: string;
  rol: 'medico';
  occurredAt: string;
  source: 'producer.auth.signup';
}
