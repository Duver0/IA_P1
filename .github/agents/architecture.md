# Arquitectura de Sistema Multi-Agente para Continuidad

## 1) Resumen de arquitectura detectada (basado en README)

El proyecto `IA_P1` implementa un sistema de turnos médicos en tiempo real con:

- **Backend NestJS** dividido en `producer` (API HTTP + WebSocket) y `consumer` (worker + scheduler).
- **Mensajería asíncrona** con RabbitMQ para desacoplar registro y procesamiento de turnos.
- **Persistencia** con MongoDB/Mongoose.
- **Frontend Next.js** (App Router) con arquitectura hexagonal (puertos/adaptadores), autenticación, roles y protección de rutas.
- **Infraestructura** orquestada con Docker Compose.

Reglas de diseño vigentes:

- Arquitectura **Hexagonal + SOLID**.
- Dependencias permitidas: `Presentation -> Application -> Domain` y `Infrastructure -> Domain`.
- Casos de uso sin acoplamiento directo a DB/Broker (`@InjectModel` y `ClientProxy` fuera de use cases).
- Configuración mediante `ConfigService` y variables de entorno.

## 2) Riesgos de continuidad identificados

1. **Deriva arquitectónica entre servicios**: Producer/Consumer/Frontend pueden evolucionar con reglas distintas si no hay control unificado.
2. **Regresiones cross-service**: cambios en contratos de eventos o DTO pueden romper flujo asíncrono sin detectarse temprano.
3. **Desalineación Auth/Roles**: inconsistencias entre backend, frontend y reglas de acceso pueden exponer dashboard o bloquear operaciones.
4. **Pérdida de conocimiento operativo**: decisiones de diseño y fixes críticos pueden quedar fuera de documentación trazable.
5. **Cobertura de validación incompleta en cambios rápidos**: riesgo de romper el flujo principal de turnos o realtime.

## 3) Objetivo del sistema de agentes

Garantizar continuidad mediante cinco capacidades:

- Entender estado técnico actual.
- Extender funcionalidades sin romper lo existente.
- Detectar y corregir errores con estrategia de fallback.
- Mantener estándares de arquitectura/calidad.
- Documentar automáticamente cambios relevantes.

## 4) Topología de agentes

- **Orquestador central**: `orchestrator`
- **Agentes especializados**:
  - `state-intelligence-agent`
  - `backend-hexagonal-agent`
  - `frontend-auth-agent`
  - `quality-regression-agent`
  - `incident-recovery-agent`
  - `documentation-continuity-agent`

## 5) Principios de diseño del sistema multi-agente

1. **No redundancia**: cada agente tiene frontera de responsabilidad explícita.
2. **Secuencia por valor**: análisis → implementación → validación → documentación.
3. **Fail-safe**: ante error, activar recuperación y rollback lógico por alcance.
4. **Trazabilidad**: cada ejecución produce artefactos (resumen, checklist, decisiones).
5. **Alineación estricta al stack**: NestJS, Next.js, Mongo/Mongoose, RabbitMQ, socket.io, Docker Compose.

## 6) Matriz de responsabilidades (resumen)

| Agente | Responsable principal | No hace |
|---|---|---|
| Orchestrator | Planificar, enrutar y coordinar ejecución | Implementación profunda por dominio |
| state-intelligence-agent | Diagnóstico del estado actual y brechas | Modificar código productivo |
| backend-hexagonal-agent | Cambios backend manteniendo hexagonal | Cambios UI/UX del frontend |
| frontend-auth-agent | Cambios de auth/roles y protección de rutas en Next.js | Cambios de persistencia backend |
| quality-regression-agent | Validación de regresión, cobertura y criterios de salida | Rediseño funcional |
| incident-recovery-agent | Contención, diagnóstico y recuperación de incidentes | Cambios de producto no urgentes |
| documentation-continuity-agent | Actualización de documentación y trazabilidad | Aprobación de arquitectura |

## 7) Contrato operativo entre agentes

Cada agente debe producir:

- `Contexto recibido`
- `Decisión tomada`
- `Acciones ejecutadas`
- `Resultado verificable`
- `Riesgos abiertos`
- `Siguiente paso recomendado`

## 8) Criterios de éxito

- El flujo principal de turnos se mantiene operativo.
- Los cambios respetan hexagonal + SOLID.
- Se reduce tiempo de incorporación y diagnóstico.
- Toda modificación relevante queda documentada.
