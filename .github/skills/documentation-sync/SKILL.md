---
name: documentation-sync
description: Sincroniza documentación técnica y funcional con cambios reales para preservar continuidad del proyecto.
trigger:
  - Cuando cambia arquitectura, contratos, reglas de acceso o flujos operativos
  - Cuando se corrige incidente crítico o se cierra una feature relevante
---

# Documentation Sync

## Cuándo usar
Después de cambios con impacto en operación, arquitectura o uso del sistema.

## Procedimiento
1. Identificar documentos afectados (`README.md`, `AI_WORKFLOW.md`, docs de servicio).
2. Extraer cambios reales aplicados y validados.
3. Actualizar alcance, flujos, contratos, DI y comandos operativos.
4. Incluir riesgos abiertos y decisiones técnicas tomadas.
5. Verificar consistencia terminológica entre backend y frontend.
6. Registrar fecha y versión del ajuste documental.

## Outputs esperados
- Documentación actualizada y consistente con el código.
- Resumen de cambios para continuidad del equipo.

## Ejemplos de uso
- “Nueva política de acceso por roles en dashboard”.
- “Cambio en flujo de eventos Producer/Consumer”.

## Anti-patrones (NO usar para)
- Documentar funcionalidades no implementadas.
- Actualizar docs sin validar el comportamiento real.
