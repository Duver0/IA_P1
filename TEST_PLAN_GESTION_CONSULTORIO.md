# Test Plan: Gestion de Consultorios y Sesiones Medicas

## 1. Objective
Validar que el flujo de gestion de consultorios y sesiones medicas se ejecute de forma segura, ordenada y consistente, garantizando control de acceso por rol, asignacion correcta de consultorio, cambios de estado permitidos y cierre de atencion sin rupturas operativas.

## 2. Description
Este plan cubre la capacidad de gestion de consultorios y atencion medica dentro de la plataforma de turnos medicos. Se enfoca en escenarios normales, escenarios de error y situaciones de alta sensibilidad operativa para respaldar decisiones de liberacion por parte de negocio y calidad.

## 3. Scope
### 3.1 In Scope
- Autenticacion del medico y control de acceso segun rol.
- Vinculacion del medico a consultorio.
- Visualizacion de paciente durante atencion activa.
- Gestion de disponibilidad del medico.
- Finalizacion de atencion y liberacion del consultorio.
- Validacion de transiciones de estado permitidas y bloqueadas.

### 3.2 Out of Scope
- Escenarios de volumen extremo o picos excepcionales.
- Evaluacion estetica o de estilo visual fuera del flujo principal de negocio.
- Reglas administrativas no formalizadas para perfiles distintos al medico.

## 4. User Stories & Acceptance Criteria
| User Story | Acceptance Criteria |
|------------|----------------------|
| HU-01: Autenticacion del medico | - Permite acceso solo con credenciales validas y rol medico.<br>- Rechaza credenciales invalidas.<br>- Bloquea acceso de usuarios sin rol medico. |
| HU-02: Seleccion y vinculacion a consultorio | - Permite vinculacion a consultorio libre.<br>- Rechaza vinculacion si el consultorio ya esta ocupado.<br>- Mantiene consistencia del estado de asignacion. |
| HU-03: Visualizacion del paciente en atencion | - Muestra informacion del paciente solo con atencion activa.<br>- Oculta datos del paciente cuando no hay atencion activa. |
| HU-04: Gestion de disponibilidad del medico | - Permite cambiar a no disponible cuando la secuencia de estado lo permite.<br>- Bloquea transiciones invalidas por regla de negocio.<br>- Impide asignacion de nuevos pacientes cuando aplica no disponible. |
| HU-05: Finalizacion de atencion y liberacion del consultorio | - Permite finalizar atencion con paciente asignado.<br>- Libera paciente y actualiza estado del consultorio segun regla.<br>- Bloquea cierre fuera de secuencia. |

## 5. Test Scenarios
### 5.1 Positive Scenarios
- Inicio de sesion exitoso con credenciales validas y rol medico.
- Vinculacion correcta de medico a consultorio libre.
- Visualizacion de estado de consultorio coherente en panel del medico.
- Asignacion de paciente y cambio a atencion activa en todo el flujo.
- Finalizacion correcta de atencion con liberacion de paciente y consultorio.
- Cambio a no disponible con bloqueo de nuevos pacientes.

### 5.2 Negative Scenarios
- Rechazo de acceso por credenciales incorrectas.
- Rechazo de acceso por rol no medico.
- Rechazo de vinculacion a consultorio ocupado.
- Bloqueo de transicion invalida de estado (por ejemplo, cierre sin atencion activa).
- Bloqueo de acciones no permitidas para el estado actual del consultorio.

## 6. Test Strategy
### 6.1 Execution
La ejecucion se estructura en cuatro niveles complementarios:
1. Verificacion de reglas de negocio individuales (automatizada): valida reglas criticas de acceso, vinculacion, estado y cierre en condiciones aisladas.
2. Verificacion de comportamiento de una seccion en forma aislada (mixta automatizada/manual): valida panel medico, visibilidad de acciones y mensajes operativos segun estado.
3. Verificacion de comunicacion entre areas del sistema (automatizada): valida coherencia entre autenticacion, consultorio y atencion.
4. Verificacion del flujo completo desde perspectiva de usuario final (automatizada E2E): valida recorridos integrales en espacios externos de automatizacion (UI con modelo por paginas, UI con guion de actor y operaciones API con guion de actor).

Criterios de ejecucion y salida:
- Nivel 1: 100% ejecutado, minimo 98% favorable y 100% favorable en prioridad alta.
- Nivel 2: minimo 95% ejecutado y 95% favorable, sin incidencias altas abiertas.
- Nivel 3: minimo 95% ejecutado y 95% favorable, sin inconsistencias de estado entre areas.
- Nivel 4: minimo 90% ejecutado y 90% favorable, con casos criticos favorables.

### 6.2 Data Strategy
- Preparar datos para perfiles de usuario: medico valido y usuario sin rol medico.
- Mantener conjuntos de credenciales validas e invalidas para escenarios de acceso.
- Disponer de consultorios en estados controlados: libre, ocupado, disponible, no disponible y atencion activa.
- Disponer de pacientes en estado listo para asignacion y en atencion activa.
- Definir precondiciones por escenario para asegurar reproducibilidad y trazabilidad de resultados.

## 7. Risk Matrix
| Risk Description | Probability (1-5) | Impact (1-5) | Risk Level | Mitigation |
|------------------|-------------------|--------------|------------|------------|
| Acceso de usuario sin rol medico al flujo de atencion | 4 | 5 | 20 (Alto) | Pruebas obligatorias de control de rol, bloqueo de liberacion ante cualquier incidencia alta. |
| Doble asignacion de consultorio | 4 | 5 | 20 (Alto) | Casos de rechazo de consultorio ocupado en niveles unitario, integracion y E2E. |
| Cierre de atencion fuera de secuencia | 3 | 5 | 15 (Alto) | Validar transiciones permitidas y bloqueadas; bloquear salida si existe incidencia alta. |
| Inconsistencia de estado durante atencion activa | 3 | 5 | 15 (Alto) | Pruebas de consistencia transversal entre autenticacion, consultorio y atencion. |
| Mensajes operativos poco claros durante acciones en curso | 3 | 2 | 6 (Medio) | Verificacion funcional del mensaje de accion en proceso y seguimiento de mejora UX. |

## 8. Prerequisites & Requirements
- Entorno de pruebas funcional con modulos de autenticacion, consultorio y atencion habilitados.
- Medico registrado con rol medico y credenciales vigentes.
- Usuario registrado sin rol medico para validaciones de bloqueo.
- Consultorios disponibles para estados libre y ocupado.
- Paciente disponible para escenarios de atencion activa.
- Definicion vigente de reglas de transicion de estado y criterios de bloqueo de liberacion.

## 9. Schedule & Agreements
- Orden de ejecucion acordado: Nivel 1 -> Nivel 2 -> Nivel 3 -> Nivel 4.
- Cierre y reporte por nivel con evidencia de ejecucion, porcentaje favorable y riesgos residuales.
- Incidencias altas en acceso por rol, doble asignacion, cierre fuera de secuencia o incoherencia de estado bloquean liberacion.
- Incidencias medias se aceptan solo con plan formal de correccion y fecha comprometida.

## 10. Team
| Name | Role |
|------|------|
| orchestrator | Coordina la estrategia, enruta tareas entre agentes y consolida cierre con trazabilidad. |
| state-intelligence-agent | Diagnostica estado actual, dependencias y riesgos antes de implementar cambios. |
| backend-hexagonal-agent | Implementa cambios backend (Producer/Consumer) respetando arquitectura hexagonal y SOLID. |
| frontend-auth-agent | Implementa y ajusta autenticacion, roles y proteccion de rutas en frontend Next.js. |
| quality-regression-agent | Ejecuta validaciones de regresion y emite decision de salida segun evidencia. |
| incident-recovery-agent | Gestiona contencion, recuperacion y postmortem ante incidentes criticos. |
| documentation-continuity-agent | Mantiene documentacion sincronizada con cambios reales y riesgos abiertos. |
| agent-tdd | Define y ejecuta estrategia TDD outside-in para cambios NestJS/Next.js en TypeScript. |
