# Phase 1 — Dead Code Removal

## Principle

Dead code creates confusion, inflates bundle size, and incurs maintenance cost.
Remove it before any refactoring to avoid accidentally "fixing" unused code.

## Identification Checklist

```bash
# Find unused exports
npx ts-prune --project tsconfig.json

# Find files with zero importers
grep -rn "useTurnosRealtime" src/   # hook reemplazado por useTurnosWebSocket
grep -rn "api/mock" src/            # mock endpoint no referenciado
```

## Targets in This Codebase

### 1.1 `src/hooks/useTurnosRealtime.ts` — ELIMINAR

| Aspecto             | Detalle                                                  |
| ------------------- | -------------------------------------------------------- |
| **Tipo**            | Hook legacy de polling                                   |
| **Reemplazado por** | `useTurnosWebSocket.ts`                                  |
| **Importado por**   | Nadie                                                    |
| **Agravante**       | Viola DIP (instancia `HttpTurnoRepository` directamente) |

**Verificación antes de borrar:**

```bash
grep -rn "useTurnosRealtime" src/
# Si retorna 0 resultados fuera del propio archivo → seguro de borrar
```

### 1.2 `src/app/api/mock/turnos/route.ts` — ELIMINAR

| Aspecto           | Detalle                                                              |
| ----------------- | -------------------------------------------------------------------- |
| **Tipo**          | Mock API hardcodeado                                                 |
| **Problema**      | Retorna data incompleta (sin `estado`, sin `priority`, sin `cedula`) |
| **Importado por** | Nadie                                                                |
| **Origen**        | Prototipo inicial, nunca fue removido                                |

**Verificación antes de borrar:**

```bash
grep -rn "api/mock" src/
# 0 resultados → seguro de borrar

# También verificar en tests o scripts
grep -rn "mock/turnos" .
```

## Proceso Seguro de Eliminación

1. **Buscar todas las referencias** al archivo (imports, rutas dinámicas, fetch calls)
2. **Verificar que no hay tests** que dependan del archivo/mock
3. **Eliminar el archivo** con `git rm` para que quede en el historial
4. **Ejecutar `npm run build`** para confirmar que no se rompe nada
5. **Ejecutar `npm run lint`** para confirmar que no quedan imports fantasma

## Regla General para Detectar Código Muerto

Un archivo es **candidato a eliminación** si cumple TODAS estas condiciones:

```
□ No tiene importers en la base de código (grep confirma 0 refs)
□ No es un archivo especial de Next.js (layout, page, middleware, route)
□ No está referenciado en configuración (next.config, package.json scripts)
□ No está referenciado en tests
□ Existe un reemplazo funcional (en caso de ser un hook o servicio)
```
