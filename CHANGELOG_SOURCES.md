# Bitácora de contraste de fuentes

## Fase de ideación y definición de la propuesta de la IA
### Propuesta
La IA propone cinco funcionalidades basadas en el proyecto actual; todas están por debajo de la exigencia. Eran propuestas aisladas que no aprovechaban la arquitectura de microservicios existente ni resolvían la falta de un perfil del personal:

1. Priorización inteligente.
2. Notificaciones omnicanal.
3. Balanceo de prioridad de pacientes.
4. Gestión del personal.
5. Sala de espera virtual.

### Decisión
Se decide tomar una parte de la propuesta de gestión del personal, pero enfocada en el profesional en salud responsable de la atención del paciente, ya que actualmente no existe un perfil de médico y la atención se organiza por tiempo y no bajo un criterio humano.

### Contraste crítico
Requiere diseño de autenticación, manejo de estados de consultorios y emisión de eventos vía WebSockets para actualizar la vista del paciente.