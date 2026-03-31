---
name: feature-extension
description: Extiende funcionalidades existentes sin romper flujos críticos del sistema de turnos, auth y realtime.
trigger:
  - Cuando el requerimiento agrega capacidad nueva sobre módulos existentes
  - Cuando se necesita ampliar auth/roles/rutas o casos de uso de turnos
---

# Feature Extension

## Cuándo usar
Cuando se implementa una nueva historia funcional sobre comportamiento ya existente.

## Procedimiento
1. Delimitar alcance funcional exacto y exclusiones.
2. Mapear impacto por servicio: `backend/producer`, `backend/consumer`, `frontend`.
3. Preservar contratos actuales; si cambian, documentar compatibilidad.
4. Implementar por incrementos pequeños: dominio → aplicación → adaptadores/presentación.
5. Ejecutar validación mínima por incremento.
6. Integrar cambios y verificar flujo principal (`POST /turnos` + procesamiento + notificación).
7. Entregar resumen de impacto, riesgos y próximos pasos.

## Outputs esperados
- Implementación incremental con cambios acotados.
- Registro explícito de compatibilidad de contratos.
- Evidencia de no regresión en flujo crítico.

## Ejemplos de uso
- “Crear gestión de pacientes para perfil médico”.
- “Agregar regla adicional de autorización para dashboard”.

## Anti-patrones (NO usar para)
- Reescritura completa de módulos cuando solo se requiere extensión.
- Mezclar feature nueva con refactor masivo no solicitado.
