---
name: architecture-guardrails
description: Valida y preserva reglas de arquitectura hexagonal + SOLID en Producer, Consumer y Frontend antes, durante y después de cualquier cambio.
trigger:
  - Cuando una tarea toca múltiples capas (Domain/Application/Infrastructure/Presentation)
  - Cuando se agregan casos de uso, puertos, adaptadores o DI
  - Cuando hay riesgo de acoplar lógica de negocio a infraestructura
---

# Architecture Guardrails

## Cuándo usar
Usar para cualquier cambio estructural o funcional en backend/frontend que pueda romper fronteras de arquitectura.

## Procedimiento
1. Identificar módulos y capas impactadas.
2. Verificar regla de dependencias: `Presentation -> Application -> Domain` y `Infrastructure -> Domain`.
3. Confirmar que los use cases no dependen de `@InjectModel`, `ClientProxy` ni APIs externas directas.
4. Validar que puertos/interfaces existan en Domain/Application y adaptadores en Infrastructure.
5. Revisar wiring DI: tokens, providers y módulos actualizados.
6. Verificar que configuración sensible use `.env` + `ConfigService`.
7. Emitir checklist de cumplimiento y riesgos abiertos.

## Outputs esperados
- Checklist de arquitectura (cumple/no cumple por regla).
- Hallazgos de acoplamiento indebido y propuesta de corrección.
- Lista de archivos de DI a actualizar.

## Ejemplos de uso
- “Agregar login y rol médico en backend” → validar puertos de auth/roles, casos de uso y guards.
- “Extender flujo de turnos con nuevo evento RabbitMQ” → validar separación dominio/adaptador y `ack/nack`.

## Anti-patrones (NO usar para)
- Cambios puramente de texto/documentación sin impacto técnico.
- Reformateo superficial de código sin modificar responsabilidades.
