---
name: runtime-ops-observability
description: Estandariza operación local y diagnóstico operativo en entorno Docker Compose para Producer, Consumer, RabbitMQ, MongoDB y Frontend.
trigger:
  - Cuando hay fallos de ejecución, integración o disponibilidad
  - Cuando se necesita verificar salud operativa antes/después de cambios
---

# Runtime Ops Observability

## Cuándo usar
Para validar disponibilidad y flujo operativo del sistema en runtime.

## Procedimiento
1. Verificar estado de contenedores y puertos críticos.
2. Confirmar variables de entorno requeridas y consistencia entre servicios.
3. Revisar logs por servicio con foco en errores de conexión (RabbitMQ/Mongo).
4. Validar camino crítico de negocio end-to-end.
5. Registrar señales operativas: cola, consumo, persistencia, emisión WS.
6. Definir acción: continuar, corregir configuración o escalar incidente.

## Outputs esperados
- Diagnóstico operativo del entorno.
- Lista de fallos de disponibilidad/configuración.
- Recomendación concreta de contención o corrección.

## Ejemplos de uso
- “Consumer no procesa mensajes después de deploy local”.
- “Frontend no recibe actualizaciones en tiempo real”.

## Anti-patrones (NO usar para)
- Cambios de lógica de negocio que deben resolverse en skills de desarrollo.
- Diagnósticos sin revisar logs ni señales de infraestructura.
