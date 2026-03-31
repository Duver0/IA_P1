---
name: skill-routing-orchestrator
description: Define reglas de selección, prioridad y resolución de conflictos entre skills para el agente orquestador.
trigger:
  - Al iniciar cualquier tarea no trivial
  - Cuando una solicitud requiere múltiples skills potenciales
---

# Skill Routing Orchestrator

## Cuándo usar
Siempre que el orquestador deba decidir qué skill aplicar y en qué orden.

## Reglas de selección
1. Clasificar tarea por intención principal:
   - Extender funcionalidad → `feature-extension`
   - Corregir fallo → `bug-diagnosis`
   - Refactor sin cambio funcional → `refactoring-safe`
   - Validación de arquitectura → `architecture-guardrails`
   - Generar/ajustar pruebas → `test-generation`
   - Revisar calidad de entrega → `code-review`
   - Actualizar documentación → `documentation-sync`
   - Problema operativo/runtime → `runtime-ops-observability`
2. Si hay ambigüedad, iniciar con `bug-diagnosis` (si hay error) o `feature-extension` (si hay requerimiento nuevo).
3. Siempre agregar `architecture-guardrails` cuando se toquen capas múltiples.

## Prioridad de ejecución
1. Continuidad operativa (incidentes / flujo de turnos caído).
2. Seguridad y control de acceso (auth/roles).
3. Integridad de arquitectura.
4. Entrega funcional.
5. Documentación y cierre.

## Resolución de conflictos entre skills
- **Conflicto:** `feature-extension` propone cambios amplios y `refactoring-safe` limita alcance.
  - **Regla:** prevalece `refactoring-safe` si no hay aprobación explícita de cambio de alcance.
- **Conflicto:** `bug-diagnosis` sugiere fix rápido que viola arquitectura.
  - **Regla:** prevalece `architecture-guardrails`; buscar fix mínimo compatible.
- **Conflicto:** `code-review` aprueba pero faltan pruebas.
  - **Regla:** `test-generation` es bloqueante para reglas críticas.

## Flujo recomendado del orquestador
1. Selección inicial de skill primaria.
2. Aplicación de skill secundaria de control (`architecture-guardrails`).
3. Validación con `test-generation`/`code-review` según riesgo.
4. Cierre obligatorio con `documentation-sync`.

## Outputs esperados
- Skill primaria + skills complementarias seleccionadas.
- Orden de ejecución justificado.
- Criterio de cierre y bloqueos.

## Anti-patrones (NO usar para)
- Aplicar todas las skills por defecto sin criterio.
- Cambiar prioridad por preferencias subjetivas.
- Omitir skill de documentación al finalizar cambios relevantes.
