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
El problema no es de optimización, sino de modelado del dominio
Sin un actor médico, no existe control real sobre el flujo
Cualquier mejora sobre el sistema actual perpetúa un modelo incorrecto

## Requerimientos Funcionales e Historias de Usuario

[Fuente usada al momento de desarrolllar la HU](https://scrum-master.org/en/creating-the-perfect-user-story-with-invest-criteria/)

Durante la construcción de HUs se identificaron errores:

- Mezcla entre:
  - intención del usuario (HU)
  - comportamiento del sistema (RF)
- Historias demasiado amplias y no testeables
- Ambigüedad en la información mostrada
- Falta de trazabilidad entre HU y RF

Inicialmente, la IA no identificó reglas críticas del dominio, tales como:

- Exclusividad entre médico y consultorio
- Control de disponibilidad operativa
- Restricción en la asignación de pacientes
- Eleccion automatica del sistema a consultorios disponibles

Se incorporan reglas de negocio dentro de los requerimientos funcionales para:

- Garantizar consistencia del sistema
- Evitar conflictos de concurrencia
- Controlar la asignación de turnos

## Corrección de modelo de estados: Vista pública

### Propuesta IA
La IA modeló el sistema iniciando desde un estado de usuario no autenticado, asumiendo que todo el flujo dependía del login del médico.

### Problema
El sistema real permite a usuarios no autenticados consultar la lista de espera, por lo que no depende completamente de la autenticación para tener valor.

### Corrección aplicada
Se introduce una **Vista Pública** como estado base del sistema, y el flujo del médico se modela como una interacción adicional, no como el punto de inicio.

## Referencia: ejemplos Gherkin
Se añade referencia con ejemplos de redacción de Features en Gherkin (en la sesión del 25 se recomendó usar HU en este lenguaje):
https://www.itdo.com/blog/ejemplos-bdd-behavior-driven-development-con-gherkin/