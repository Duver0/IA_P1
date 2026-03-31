---
name: code-review
description: Ejecuta revisión técnica de cambios con foco en arquitectura, seguridad, mantenibilidad y riesgo de regresión.
trigger:
  - Antes de merge/release
  - Cuando el diff toca auth, colas, persistencia o DI
---

# Code Review

## Cuándo usar
En toda entrega relevante que afecte flujo de negocio o capas críticas.

## Procedimiento
1. Clasificar el cambio por riesgo (bajo/medio/alto).
2. Revisar cumplimiento de hexagonal + SOLID.
3. Verificar seguridad básica: secretos, validación de input, manejo de errores.
4. Detectar acoplamientos, duplicación y deuda añadida.
5. Confirmar pruebas adecuadas al riesgo.
6. Emitir hallazgos priorizados: bloqueante, importante, recomendación.
7. Definir criterio final: aprobar / aprobar con cambios / rechazar.

## Outputs esperados
- Informe de revisión con severidad por hallazgo.
- Lista de acciones obligatorias antes de cierre.

## Ejemplos de uso
- “PR con nuevos endpoints de auth y cambios en guards de frontend”.
- “PR que modifica publicación/consumo de eventos RabbitMQ”.

## Anti-patrones (NO usar para)
- Comentarios subjetivos sin impacto técnico.
- Exigir cambios no relacionados con el alcance.
