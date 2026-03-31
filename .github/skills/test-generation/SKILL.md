---
name: test-generation
description: Diseña y genera pruebas alineadas al riesgo y a la arquitectura hexagonal para backend y frontend.
trigger:
  - Cuando se agrega o modifica lógica de negocio
  - Cuando un bug corregido requiere prueba de no regresión
---

# Test Generation

## Cuándo usar
Siempre que un cambio altere comportamiento observable o reglas de negocio.

## Procedimiento
1. Identificar unidad de comportamiento a verificar.
2. Seleccionar nivel de prueba mínimo eficaz: unitaria, integración o componente.
3. Definir casos: feliz, borde y error.
4. Aislar dependencias externas mediante puertos/mocks.
5. Implementar pruebas legibles con nombres orientados a comportamiento.
6. Ejecutar pruebas focalizadas y luego suite relevante.
7. Validar que la prueba falla antes del fix (cuando aplique) y pasa después.

## Outputs esperados
- Pruebas nuevas/actualizadas con cobertura de reglas críticas.
- Evidencia de no regresión.

## Ejemplos de uso
- “Agregar validación de rol médico en AuthGuard”.
- “Corregir duplicidad de turno por cédula”.

## Anti-patrones (NO usar para)
- Tests acoplados a implementación interna frágil.
- Cobertura superficial sin validar reglas de negocio.
