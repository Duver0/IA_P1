# Coverage Report - Consumer Service

> Ultima actualizacion: Abril 2026  
> Comando fuente: `npm run test:cov -- --runInBand`  
> Display name: `📦 CONSUMER`

## Metricas Globales

| Metrica | Cubierto | Total | Cobertura |
|---------|----------|-------|-----------|
| Statements | 667 | 740 | 90.14% |
| Branches | 267 | 393 | 67.94% |
| Functions | 110 | 117 | 94.02% |
| Lines | 631 | 704 | 89.63% |

## Resumen de Ejecucion

| Dato | Valor |
|------|-------|
| Test suites | 20 passed / 20 total |
| Tests | 117 passed / 117 total |
| Snapshots | 0 |
| Tiempo | 17.234 s |

## Archivos Excluidos de Cobertura

Configurados en `collectCoverageFrom` de `jest.config.js`:

```javascript
collectCoverageFrom: [
  'src/**/*.(t|j)s',
  '!src/main.ts',
  '!src/app.module.ts',
  '!src/**/*.module.ts',
  '!src/**/*.schema.ts',
]
```
