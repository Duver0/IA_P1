# Workflows del Sistema Multi-Agente

Este documento define flujos estándar para continuidad, evolución y recuperación del proyecto.

## Flujo 1: Implementación de feature (normal)

### Objetivo
Implementar una funcionalidad nueva sin romper el flujo actual de turnos.

### Secuencia
1. `orchestrator` recibe solicitud y clasifica alcance.
2. `state-intelligence-agent` produce diagnóstico del estado actual y riesgos.
3. `backend-hexagonal-agent` y/o `frontend-auth-agent` implementan cambios según alcance.
4. `quality-regression-agent` ejecuta validaciones y criterios de salida.
5. `documentation-continuity-agent` actualiza documentación técnica y de cambios.
6. `orchestrator` emite cierre con estado final.

### Criterios de salida
- Compilación sin errores.
- Flujo principal de turnos sin regresión.
- Validaciones de auth/roles consistentes con alcance.
- Documentación actualizada.

---

## Flujo 2: Cambio backend (producer/consumer)

### Activador
Cambios en casos de uso, adaptadores, contratos de eventos o persistencia.

### Secuencia
1. `orchestrator` deriva a `backend-hexagonal-agent`.
2. `backend-hexagonal-agent` valida fronteras de capas y puertos.
3. Si hay impacto cross-service, consulta a `state-intelligence-agent` para mapa de dependencias.
4. `quality-regression-agent` ejecuta pruebas focalizadas e integración.
5. `documentation-continuity-agent` registra DI, contratos y decisiones.

### Fallback
Si falla validación de arquitectura o tests críticos:
- congelar cambio,
- aislar diff mínimo,
- abrir ruta de `incident-recovery-agent`.

---

## Flujo 3: Cambio frontend (auth, roles, rutas)

### Activador
Cambios en `AuthGuard`, formularios `signIn/signUp`, middleware `proxy.ts`, reglas de rol.

### Secuencia
1. `orchestrator` deriva a `frontend-auth-agent`.
2. `frontend-auth-agent` implementa cambios en puertos/adaptadores sin acoplar UI a infraestructura.
3. `quality-regression-agent` verifica rutas públicas/protegidas y regresión UX crítica.
4. `documentation-continuity-agent` actualiza reglas funcionales y de acceso.

### Fallback
Ante inconsistencia de roles o rutas:
- restaurar política previa,
- dejar feature flag o guard temporal,
- escalar a `incident-recovery-agent` si hay impacto productivo.

---

## Flujo 4: Incidente / error en producción o preproducción

### Activador
Fallo en procesamiento de turnos, pérdida de eventos, error de autenticación crítica, caída de servicio.

### Secuencia
1. `orchestrator` activa `incident-recovery-agent` como prioridad máxima.
2. `incident-recovery-agent` ejecuta contención y diagnóstico causa raíz.
3. `quality-regression-agent` valida fix mínimo sin regresión mayor.
4. `documentation-continuity-agent` registra postmortem y acciones preventivas.
5. `orchestrator` cierra incidente con lecciones y backlog preventivo.

### Política de priorización
- Prioridad 1: flujo principal de turnos caído.
- Prioridad 2: autenticación/roles comprometidos.
- Prioridad 3: degradación no bloqueante.

---

## Flujo 5: Deuda técnica y hardening de continuidad

### Activador
Brechas de arquitectura, duplicación, pruebas insuficientes o documentación obsoleta.

### Secuencia
1. `state-intelligence-agent` cuantifica deuda y propone plan incremental.
2. `backend-hexagonal-agent` / `frontend-auth-agent` ejecutan refactors acotados.
3. `quality-regression-agent` valida no regresión.
4. `documentation-continuity-agent` actualiza convenciones y changelog técnico.

---

## Artefactos requeridos por workflow

Cada flujo debe dejar:

- `Resumen de contexto`.
- `Plan ejecutado`.
- `Cambios aplicados`.
- `Validaciones ejecutadas`.
- `Riesgos abiertos`.
- `Próximas acciones`.
