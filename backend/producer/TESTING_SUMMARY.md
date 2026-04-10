# Testing Summary - Producer Service

> API REST + WebSocket para gestion de turnos medicos.

## Resumen de Ejecucion (Abril 2026)

| Dato | Valor |
|------|-------|
| Comando | `npm test -- --runInBand` |
| Test suites | 25 passed / 25 total |
| Tests | 107 passed / 107 total |
| Snapshots | 0 |
| Tiempo | 13.487 s |

## Detalle por Suite

| Capa | Archivo | Tests |
|------|---------|-------|
| Application | `application/auth/login.use-case.spec.ts` | 3 |
| Application | `application/auth/signup.use-case.spec.ts` | 4 |
| Application | `application/create-turno.use-case.spec.ts` | 3 |
| Application | `application/get-all-turnos.use-case.spec.ts` | 2 |
| Application | `application/get-consultorio-state.use-case.spec.ts` | 3 |
| Application | `application/get-turnos-by-cedula.use-case.spec.ts` | 2 |
| Application | `application/medical-commands.use-cases.spec.ts` | 6 |
| Application | `application/process-outbox-events.use-case.spec.ts` | 4 |
| Domain | `domain/turno.entity.spec.ts` | 2 |
| Infrastructure | `infrastructure/hmac-token.service.spec.ts` | 5 |
| Infrastructure | `infrastructure/in-memory-user.repository.spec.ts` | 4 |
| Infrastructure | `infrastructure/outbox-publisher.worker.spec.ts` | 6 |
| Infrastructure | `infrastructure/rabbitmq-event-publisher.adapter.spec.ts` | 2 |
| Infrastructure | `infrastructure/rabbitmq-outbox-event-publisher.adapter.spec.ts` | 4 |
| Infrastructure | `infrastructure/scrypt-password-hasher.adapter.spec.ts` | 5 |
| Infrastructure | `infrastructure/turno-mongoose.adapter.spec.ts` | 4 |
| Infrastructure | `infrastructure/user-mongoose.adapter.spec.ts` | 4 |
| Presentation | `presentation/auth.controller.spec.ts` | 11 |
| Presentation | `presentation/auth.guard.spec.ts` | 3 |
| Presentation | `presentation/events.controller.spec.ts` | 5 |
| Presentation | `presentation/medical.controller.spec.ts` | 7 |
| Presentation | `presentation/producer.controller.spec.ts` | 3 |
| Presentation | `presentation/roles.decorator.spec.ts` | 1 |
| Presentation | `presentation/roles.guard.spec.ts` | 4 |
| Presentation | `presentation/turnos.gateway.spec.ts` | 10 |

## Cobertura Relacionada

Las metricas de cobertura de esta misma corrida se encuentran en `test/COVERAGE.md`.

## Escenarios Clave Cubiertos

- Flujo de autenticacion con mapeo HTTP contractual (`201`, `200`, `401`, `409`, `500`).
- Publicacion de comandos medicos y eventos de turno via RabbitMQ.
- Procesamiento de outbox con reintentos y metricas de publicacion.
- Emision de snapshot y broadcast realtime en gateway de turnos.

## Comandos Utiles

```bash
# Ejecutar suite completa
npm test -- --runInBand

# Ejecutar con cobertura
npm run test:cov -- --runInBand

# Ejecutar en watch mode
npm run test:watch
```
