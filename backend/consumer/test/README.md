# Testing Guide - Consumer Service

> Worker de procesamiento de turnos con scheduler de observabilidad

## Documentación

| Archivo | Descripción |
|---------|-------------|
| [TESTING_SUMMARY.md](TESTING_SUMMARY.md) | Listado de todas las suites y tests |
| [COVERAGE.md](COVERAGE.md) | Métricas de cobertura y evidencias |

---

## Quick Start

```bash
# Ejecutar tests
npm test -- --runInBand

# Con cobertura
npm run test:cov -- --runInBand
```

---

## Patrones Aplicados

- **AAA** (Arrange, Act, Assert) en cada caso
- **Test Doubles** sobre puertos hexagonales (`ITurnoRepository`, `IEventPublisher`)
- **Fake Timers** para testing del heartbeat del scheduler de observabilidad

---

## Arquitectura de Tests

```
test/
├── application/    → Use cases
├── domain/         → Entidades
├── infrastructure/ → Adapters
├── presentation/   → Controllers
├── scheduler/      → Scheduler service
├── notifications/  → Notification service
└── assets/         → Evidencias (screenshots)
```