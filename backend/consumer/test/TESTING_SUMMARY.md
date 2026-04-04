# Testing Summary - Consumer Service

> Worker de procesamiento de turnos con scheduler de observabilidad.

## Resumen de Ejecucion (Abril 2026)

| Dato | Valor |
|------|-------|
| Comando | `npm test -- --runInBand` |
| Test suites | 20 passed / 20 total |
| Tests | 117 passed / 117 total |
| Snapshots | 0 |
| Tiempo | 12.085 s |

## Detalle por Suite

| Capa | Archivo | Tests |
|------|---------|-------|
| Application | `application/assign-doctor-to-consultorio.use-case.spec.ts` | 5 |
| Application | `application/assign-patient-to-consultorio.use-case.spec.ts` | 4 |
| Application | `application/create-turno.use-case.spec.ts` | 3 |
| Application | `application/finalize-medical-attention.use-case.spec.ts` | 5 |
| Application | `application/provision-doctor-from-user.use-case.spec.ts` | 4 |
| Application | `application/release-consultorio.use-case.spec.ts` | 5 |
| Application | `application/set-doctor-availability.use-case.spec.ts` | 6 |
| Application | `application/start-medical-attention.use-case.spec.ts` | 4 |
| Domain | `domain/consultorio-session.entity.spec.ts` | 21 |
| Domain | `domain/turno.entity.spec.ts` | 2 |
| Infrastructure | `infrastructure/consultorio-session-mongoose.adapter.spec.ts` | 7 |
| Infrastructure | `infrastructure/doctor-mongoose.adapter.spec.ts` | 13 |
| Infrastructure | `infrastructure/mongo-unit-of-work.adapter.spec.ts` | 2 |
| Infrastructure | `infrastructure/processed-medical-command-mongoose.adapter.spec.ts` | 5 |
| Infrastructure | `infrastructure/rabbitmq-event-publisher.adapter.spec.ts` | 2 |
| Infrastructure | `infrastructure/standard-priority-sorting.strategy.spec.ts` | 1 |
| Infrastructure | `infrastructure/turno-mongoose.adapter.spec.ts` | 10 |
| Notifications | `notifications/notifications.service.spec.ts` | 2 |
| Presentation | `presentation/consumer.controller.spec.ts` | 11 |
| Scheduler | `scheduler/scheduler.service.spec.ts` | 5 |

## Cobertura Relacionada

Las metricas de cobertura de esta misma corrida se encuentran en `COVERAGE.md`.

## Escenarios Clave Cubiertos

- Clasificacion recoverable/non-recoverable con decision de `ack`, `nack(requeue)` y DLQ.
- Reintento para `asociar_medico_consultorio` cuando el doctor aun no esta provisionado.
- Flujo de atencion medica completo: asociar, iniciar, finalizar y liberar consultorio.
- Scheduler en modo observabilidad con heartbeat y limpieza de intervalos.

## Comandos Utiles

```bash
# Ejecutar suite completa
npm test -- --runInBand

# Ejecutar con cobertura
npm run test:cov -- --runInBand

# Ejecutar en watch mode
npm run test:watch
```
