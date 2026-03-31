---
name: bug-diagnosis
description: Diagnostica bugs de forma reproducible y orientada a causa raíz en servicios NestJS/Next.js con RabbitMQ y MongoDB.
trigger:
  - Cuando hay errores funcionales, intermitentes o de integración
  - Cuando falla un flujo crítico (turnos, auth, realtime)
---

# Bug Diagnosis

## Cuándo usar
Ante cualquier falla reportada sin causa evidente o con impacto operativo.

## Procedimiento
1. Definir síntoma exacto, alcance e impacto.
2. Reproducir el bug con pasos mínimos determinísticos.
3. Delimitar capa origen: presentación, aplicación, dominio o infraestructura.
4. Verificar contratos entre servicios (HTTP, eventos RabbitMQ, mappers).
5. Identificar causa raíz (no solo síntoma).
6. Proponer fix mínimo seguro y plan de validación.
7. Registrar aprendizaje para prevenir recurrencia.

## Outputs esperados
- Hipótesis confirmada de causa raíz.
- Pasos de reproducción y evidencia.
- Propuesta de fix con riesgo estimado.

## Ejemplos de uso
- “El turno se crea pero nunca pasa a asignado”.
- “Usuario autenticado no puede entrar al dashboard”.

## Anti-patrones (NO usar para)
- Parchear sin reproducir ni aislar la causa.
- Concluir por intuición sin evidencia.
