# Plan de Acción — Semana 3: DevOps, Testing Multinivel y Ecosistema

> **Fecha:** 4 de marzo de 2026  
> **División:** Backend (Producer + Consumer) | Frontend  
> **Objetivo:** Cumplir todos los entregables obligatorios de la evaluación con nivel Mid/Senior

---

## Estado Actual vs. Requerido

| Entregable | Estado | Responsable |
|---|---|---|
| Dockerfiles multi-stage + no-root | ⚠️ Parcial (sin USER node) | Backend + Frontend |
| Pipeline CI/CD separado (componente vs integración) | ✅ Hecho | Compartido |
| TEST_PLAN.md como informe técnico | ✅ Hecho | Compartido |
| Scripts `test:component` y `test:integration` separados | ✅ Hecho | Backend + Frontend |
| Jest configs escopadas por nivel | ✅ Hecho | Backend + Frontend |
| Prueba Caja Negra (flujo API real) | ❌ Pendiente | Backend |
| Escaneo de vulnerabilidades de imagen (Trivy) | ✅ Integrado en pipeline | Compartido |
| GitFlow + PR formal develop → main | ⚠️ Pendiente después del trabajo | Compartido |

---

## 👤 PERSONA 1 — Backend (Producer + Consumer)

### 🐳 B1 · Dockerfile Producer — Agregar usuario no-root

**Archivo:** `backend/producer/Dockerfile`  
**Estado:** ❌ PENDIENTE  
**Estado actual:** Multi-stage ✅, imagen slim ✅, **corre como root** ❌  
**Qué hacer:**
- En el stage `production`, agregar creación de usuario sin privilegios antes de `CMD`
- Agregar `USER node` (node:20-slim ya incluye el usuario `node`)
- Verificar que `WORKDIR /app` tenga permisos correctos con `chown`

```dockerfile
# Al final del stage production, antes del CMD:
RUN chown -R node:node /app
USER node
```

---

### 🐳 B2 · Dockerfile Consumer — Completar hardening

**Archivo:** `backend/consumer/Dockerfile`  
**Estado:** ❌ PENDIENTE  
**Estado actual:** Multi-stage ✅, básico ⚠️  
**Qué hacer:**
- Igual que B1: agregar `USER node`
- Cambiar `npm install --omit=dev` por `npm ci --omit=dev` en producción
- Agregar `RUN chown -R node:node /app`

---

### 🧪 B3 · Separar scripts de test en Producer y Consumer

**Archivos:** `backend/producer/package.json`, `backend/consumer/package.json`  
**Estado:** ✅ COMPLETADO  
**Archivos creados:** `jest.config.component.js`, `jest.config.integration.js` en producer y consumer  
**Validado:** Producer 19/19 ✅ · Consumer 13/13 ✅ · Coverage 100% en capas correspondientes  
**Qué hacer:**
- Definir `test:component` → corre tests de `domain/` y `application/` (sin deps externas)
- Definir `test:integration` → corre tests de `infrastructure/` y `presentation/` con supertest
- Crear `jest.config.component.js` y `jest.config.integration.js` (o usar `--testPathPattern`)

```json
"test:component": "jest --testPathPattern='(domain|application)'",
"test:integration": "jest --testPathPattern='(infrastructure|presentation)'"
```

---

### 🧪 B4 · Prueba de Caja Negra — POST /turnos via supertest (Producer)

**Archivo:** `backend/producer/test/presentation/turnos.blackbox.spec.ts` (nuevo)  
**Estado:** ❌ PENDIENTE  
**Qué hacer:**
- Crear prueba e2e con `supertest` que levante la app real (sin mocks de negocio) y haga:
  1. `POST /turnos` con payload válido → esperar `202 Accepted`
  2. `GET /turnos` → esperar array
  3. `GET /turnos/:cedula` → esperar resultado filtrado
- Esta prueba NO debe conocer detalles internos del repositorio ni del broker
- Mockear solo la conexión a RabbitMQ y MongoDB usando `TestingModule` de NestJS con adaptadores en memoria

> **Por qué es Caja Negra:** se prueba el comportamiento externo de la API (entradas/salidas HTTP) sin conocer la implementación interna de los casos de uso ni los adaptadores.

---

### 🧪 B5 · Verificar cobertura de Caja Blanca existente

**Archivos:** `backend/producer/test/application/`, `backend/consumer/test/application/`  
**Estado:** ⚠️ PENDIENTE REVISIÓN  
**Estado actual:** Existen pruebas de use cases con mocks ✅  
**Qué hacer:**
- Revisar que los tests de `create-turno.use-case.spec.ts`, `get-all-turnos.use-case.spec.ts` etc. prueben flujos internos (ramas `if/else`, valores de retorno, errores)
- Asegurarse de que hay al menos un test con `expect(port.method).toHaveBeenCalledWith(...)` — esto es Caja Blanca pura
- Documentar en TEST_PLAN.md cuáles son Caja Blanca

---

### 📄 B6 · Contribución al TEST_PLAN.md (sección Backend)

**Ver sección compartida C1 abajo.**  
**Responsabilidad Backend:**
- Tabla de Test Suites del producer y consumer
- Argumentación de Principio 1 (exhaustive testing), Principio 4 (defect clustering), Principio 6 (context-dependent)
- Diseño de casos de prueba de Caja Blanca y Caja Negra con formato tabla

---

## 👤 PERSONA 2 — Frontend

### 🐳 F1 · Dockerfile Frontend — Refactor completo a multi-stage

**Archivo:** `frontend/Dockerfile`  
**Estado:** ❌ PENDIENTE  
**Estado actual:** Single-stage, corre como root, usa `next dev` (no producción) ❌  
**Qué hacer:**
- Reescribir con 3 stages: `deps`, `builder`, `runner`
- Stage `runner` debe usar `node:20-alpine` (más ligero) y `USER node`
- El CMD debe usar `next start` (producción), no `next dev`

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
```

> Nota: Requiere habilitar `output: 'standalone'` en `next.config.ts`

---

### 🧪 F2 · Separar scripts de test en Frontend

**Archivo:** `frontend/package.json`  
**Estado:** ✅ COMPLETADO  
**Archivos creados:** `jest.config.component.ts`, `jest.config.integration.ts` en frontend  
**Validado:** 111/111 tests PASS ✅ · Jest 30 (flag `--testPathPatterns` corregido)  
**Qué hacer:**
- `test:component` → tests de componentes React aislados (`components/`, `hooks/`)
- `test:integration` → tests que simulan flujos completos con providers reales (`providers/`, `app/`)

```json
"test:component": "jest --testPathPattern='(components|hooks)'",
"test:integration": "jest --testPathPattern='(providers|infrastructure|app)'"
```

---

### 🧪 F3 · Verificar y reforzar pruebas existentes

**Directorio:** `frontend/src/__tests__/`  
**Estado:** ⚠️ PENDIENTE REVISIÓN  
**Qué hacer:**
- Revisar `__tests__/app/` — deben probar rutas/páginas como Caja Negra (render + interacción de usuario)
- Revisar `__tests__/components/` — Caja Blanca (estructura interna, props, estados)
- Revisar `__tests__/hooks/` — Caja Blanca (lógica interna del hook)
- Confirmar que los providers mockeados no exponen detalles de implementación en los tests de integración

---

### 📄 F4 · Contribución al TEST_PLAN.md (sección Frontend)

**Ver sección compartida C1 abajo.**  
**Responsabilidad Frontend:**
- Tabla de Test Suites del frontend
- Argumentación de Principio 2 (exhaustive testing impossible), Principio 3 (early testing), Principio 7 (absence of errors fallacy)
- Diseño de casos de prueba de Caja Blanca (componentes) y Caja Negra (flujos de usuario)

---

## 🤝 COMPARTIDO — CI/CD + Documentación

### ⚙️ C1 · Crear TEST_PLAN.md

**Archivo:** `TEST_PLAN.md` (raíz del proyecto)  
**Estado:** ✅ COMPLETADO  
**Contiene:** 7 Principios aplicados al proyecto · 3 Test Suites (producer, consumer, frontend) · 10 Test Cases con técnica Caja Blanca/Negra · Criterios de aceptación y umbrales de cobertura  
**Estructura requerida:**

```
1. Introducción y Scope
2. Estrategia Multinivel
   2.1 Pruebas de Componente / Caja Blanca
   2.2 Pruebas de Integración / Caja Negra
3. Los 7 Principios de las Pruebas — aplicados al proyecto
4. Test Suites
   4.1 Backend Producer
   4.2 Backend Consumer
   4.3 Frontend
5. Test Cases (tabla por suite)
6. Criterios de Aceptación y Definición de Done
7. Herramientas y Entorno
```

---

### ⚙️ C2 · Refactorizar Pipeline CI/CD

**Archivo:** `.github/workflows/ci.yml`  
**Estado:** ✅ COMPLETADO  
**Jobs creados:** `lint` → `component-tests` → `integration-tests` → `build` → `docker-scan`  
**Incluye:** upload de coverage artifacts · bloqueo por `needs:` entre jobs  
**Qué hacer — separar en jobs:**

```
jobs:
  lint              → eslint en los 3 proyectos
  component-tests   → npm run test:component (producer + consumer + frontend)
  integration-tests → npm run test:integration (needs: component-tests)
  build             → npm run build (los 3 proyectos)
  docker-build      → docker build + trivy/docker scout scan (needs: build)
```

- Usar `needs:` para forzar el orden y bloquear si algo falla
- Subir reporte de cobertura como artifact (`actions/upload-artifact`)
- Escaneo de vulnerabilidades con `aquasecurity/trivy-action` (gratuito, sin login)

---

### ⚙️ C3 · Escaneo de Vulnerabilidades de Imagen

**Herramienta:** [Trivy](https://github.com/aquasecurity/trivy-action)  
**Estado:** ✅ COMPLETADO — integrado en el job `docker-scan` del pipeline  
**Configurado para:** bloquear en CRITICAL y HIGH · escanea producer, consumer y frontend

```yaml
- name: Scan image vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'producer:latest'
    format: 'table'
    exit-code: '1'
    severity: 'CRITICAL,HIGH'
```

---

### ⚙️ C4 · Verificar GitFlow en el repositorio

**Estado:** ⚠️ PENDIENTE — rama `feature/devops-testing-multinivel` creada, falta push y PR  
**Qué revisar en GitHub:**
- Que exista rama `develop` activa
- Que las features hayan salido de `develop` (no de `main`)
- Crear PR formal de `develop → main` como Release (si no existe)
- Agregar tag semántico al merge: `v1.0.0`
- Documentar el PR con descripción de los cambios de la semana

---

## Orden de Ejecución Sugerido

```
Día 1:
  [Backend]  B1 + B2 — Dockerfiles no-root
  [Frontend] F1 — Dockerfile multi-stage

Día 2:
  [Backend]  B3 — Scripts test:component / test:integration
  [Frontend] F2 — Scripts test:component / test:integration
  [Compartido] C2 — Refactor pipeline CI/CD

Día 3:
  [Backend]  B4 — Prueba Caja Negra (POST /turnos)
  [Backend]  B5 — Revisar Caja Blanca existente
  [Frontend] F3 — Revisar y reforzar tests

Día 4:
  [Compartido] C3 — Integrar Trivy en pipeline
  [Compartido] C1 — Escribir TEST_PLAN.md (cada persona su sección)

Día 5:
  [Compartido] C4 — Verificar GitFlow + PR Release
  Validación final: pipeline en verde ✅
```

---

## Checklist Final antes de la Defensa

- [ ] Ambos Dockerfiles backend con `USER node` (no-root) — **B1, B2 pendientes**
- [ ] Frontend Dockerfile multi-stage con `next start` (producción) — **F1 pendiente**
- [x] Pipeline con jobs separados: lint, component-tests, integration-tests, build, docker-scan ✅
- [x] Script `test:component` y `test:integration` funcionando en los 3 proyectos ✅
- [x] Jest configs escopadas por nivel (`jest.config.component.*`, `jest.config.integration.*`) ✅
- [ ] Al menos 1 prueba de Caja Negra (POST /turnos via supertest) en producer — **B4 pendiente**
- [x] TEST_PLAN.md completo con 7 Principios argumentados y Test Cases en tabla ✅
- [x] Trivy scan integrado en el pipeline ✅
- [ ] Push de rama `feature/devops-testing-multinivel` y PR a `develop` — **C4 pendiente**
- [ ] Pipeline ejecutado en verde al menos una vez en el PR
