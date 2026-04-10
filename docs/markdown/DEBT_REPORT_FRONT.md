# 💀 DEBT REPORT — FRONTEND (Análisis Hostil)

**Autor:** Arquitecto Senior Hostil
**Fecha:** 2026-02-18
**Veredicto General:** 🔴 CRÍTICO — El Frontend es una fachada hexagonal: carpetas bonitas, cero sustancia.

---

## Resumen Ejecutivo

El Frontend (Next.js) pretende tener arquitectura hexagonal. Tiene carpetas `domain/`, `repositories/`, `services/`. Tiene una interfaz `TurnoRepository`. Todo es **decorativo**. Los hooks ignoran las interfaces e instancian clases concretas. El middleware de seguridad está **mal nombrado** y no se ejecuta en producción. No hay tests, ni test runner, ni dependencias de testing.

### Las cifras del horror:

| Métrica | Valor | Veredicto |
|---|---|---|
| Tests | **0** (ni siquiera tiene test runner) | 🔴 Crítico |
| Framework de testing instalado | **Ninguno** | 🔴 Crítico |
| Middleware de seguridad activo | **0** (archivo mal nombrado) | 🔴 Seguridad |
| Código muerto identificado | **3 archivos** (`useTurnosRealtime.ts`, `api/mock/turnos/route.ts`, `TurnoRepository` interfaz) | 🟡 Deuda |
| Duplicación entre páginas | **~80%** (`page.tsx` ↔ `dashboard/page.tsx`) | 🔴 DRY |
| Interfaces usadas como tipo | **0** | 🔴 DIP |

---

## Scorecard

| Principio | Estado | Severidad | Ejemplos Clave |
|---|---|---|---|
| **SRP** | 🔴 | Crítico | `page.tsx` (4 responsabilidades), `proxi.ts` (3 responsabilidades), `httpClient.ts` (3 patrones) |
| **DIP** | 🔴 | Crítico | Socket.IO directo, `new HttpTurnoRepository()`, AudioService singleton |
| **OCP** | 🟡 | Medio | sanitizer no extensible |
| **LSP** | 🟡 | Medio | `Turno` del Frontend incompleto vs Backend |
| **ISP** | 🟡 | Medio | `TurnoRepository` interface demasiado amplia |
| **DRY** | 🔴 | Crítico | `page.tsx` ↔ `dashboard/page.tsx` copy-paste, magic numbers |
| **Hexagonal** | 🔴 | Crítico | Interfaces cosméticas, dominio anémico, zero ports reales |
| **Tests** | 🔴 | Crítico | Zero tests, zero infraestructura de testing |
| **Seguridad** | 🔴 | Crítico | Middleware inactivo, sanitizer bypasseable, mock API en prod |

**Nota Final: 2/10**

---

## 1. VIOLACIONES DIP (Dependency Inversion Principle)

---

### 1.1. 🔴 CRÍTICO — Socket.IO Hardcodeado en el Frontend

| Archivo | Líneas | Ruta |
|---|---|---|
| `useTurnosWebSocket.ts` | 93 | `src/hooks/useTurnosWebSocket.ts` |

**Afectado:** `frontend/src/hooks/useTurnosWebSocket.ts` — L4, L47-53

```typescript
const socket = io(`${env.WS_URL}/ws/turnos`, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
});
```

**El crimen:** No hay interfaz `RealTimeProvider` o `TurnoEventSource`. La configuración de reconexión está hardcodeada. El namespace `/ws/turnos` es un string mágico. Si migras a SSE, WebSocket nativo, o Firebase Realtime: reescribes el hook entero.

**Consecuencias:**
- **Testing:** Imposible testear el hook sin mockear el módulo `socket.io-client` completo.
- **Portabilidad:** Cambio de transport = reescritura total.
- **Configuración:** Parámetros de reconexión sellados en código, no configurables.

---

### 1.2. 🔴 CRÍTICO — `useRegistroTurno` IGNORA la Interfaz que Existe

| Archivo | Líneas | Ruta |
|---|---|---|
| `useRegistroTurno.ts` | 110 | `src/hooks/useRegistroTurno.ts` |

**Afectado:** `frontend/src/hooks/useRegistroTurno.ts` — L5, L37, L40

```typescript
import { HttpTurnoRepository } from "@/repositories/HttpTurnoRepository";
// ...
repositoryRef.current = new HttpTurnoRepository();
```

**La ironía suprema:** ¡Existe una interfaz `TurnoRepository` en `src/repositories/TurnoRepository.ts`! Alguien la escribió. Luego este hook **la ignora olímpicamente** e instancia la clase concreta con `new`. Es como comprar un casco de moto y llevarlo colgado del brazo.

Lo mismo ocurre en `useTurnosRealtime.ts` (L4, L41, L44) — que además es código muerto.

**Consecuencias:**
- **Testing:** Para testear el hook con un mock del repo, hay que mockear el módulo completo (`jest.mock`). No se puede inyectar.
- **DIP:** El hook de alto nivel depende de la implementación concreta de bajo nivel.
- **La interfaz es letra muerta.**

---

### 1.3. 🟡 MEDIO — AudioService como Singleton Global Importado

| Archivo | Líneas | Ruta |
|---|---|---|
| `AudioService.ts` | 80 | `src/services/AudioService.ts` |

**Afectados:** `frontend/src/services/AudioService.ts` — L80, `page.tsx` — L5, `dashboard/page.tsx` — L5

```typescript
export const audioService = new AudioService(); // singleton global
import { audioService } from "@/services/AudioService"; // importación concreta
```

No hay interfaz `NotificationSoundPort`. Imposible testear componentes con un mock de audio sin monkey-patching de módulos. El singleton global sobrevive entre navegaciones con estado potencialmente corrupto.

---

### 1.4. 🟡 MEDIO — `config/env.ts`: process.env Directo, No Inyectable

| Archivo | Líneas | Ruta |
|---|---|---|
| `env.ts` | 29 | `src/config/env.ts` |

DIP menor: `process.env` se lee directamente y se exporta como objeto. No es inyectable, no es mockeable sin monkey-patching. Si cambias la fuente de configuración (ej: remote config), editas este archivo y todos sus consumidores.

---

## 2. VIOLACIONES SRP (Single Responsibility Principle)

---

### 2.1. 🔴 CRÍTICO — `page.tsx` y `dashboard/page.tsx`: 4 Responsabilidades por Página

| Archivo | Líneas | Ruta |
|---|---|---|
| `page.tsx` | 132 | `src/app/page.tsx` |
| `page.tsx` | 126 | `src/app/dashboard/page.tsx` |

Cada página es responsable de:
1. Renderizar UI de turnos
2. Gestionar audio del navegador (init, unlock, play)
3. Gestionar notificaciones toast
4. Filtrar/transformar datos de turnos por estado

Y son **~80% idénticas** entre sí (ver sección DRY).

---

### 2.2. 🟡 MEDIO — `proxi.ts`: Rate Limit + Security Headers + Method Blocking

| Archivo | Líneas | Ruta |
|---|---|---|
| `proxi.ts` | 93 | `src/proxi.ts` |

3 responsabilidades incompatibles en un solo archivo:

| Responsabilidad | Líneas | ¿Debería estar aquí? |
|---|---|---|
| Rate Limiting (in-memory) | 17-47 | ❌ Servicio propio |
| Bloqueo de métodos HTTP | 52-58 | ❌ Middleware de validación |
| Headers de seguridad (CSP, XSS, etc.) | 65-85 | ❌ Middleware de seguridad |

Si quiero cambiar la política de rate-limit, edito un archivo que también toca el CSP.

---

### 2.3. 🟡 MEDIO — `httpClient.ts`: Circuit Breaker + Retry + Timeout en 175 Líneas

| Archivo | Líneas | Ruta |
|---|---|---|
| `httpClient.ts` | 175 | `src/lib/httpClient.ts` |

Tres patrones de resiliencia independientes cocinados en un solo sartén:
1. **Circuit Breaker** (clase + estado global `circuits` Map)
2. **Retry con Exponential Backoff** (loop con `sleep`)
3. **Timeout con AbortController**

Cada uno debería ser aislable y testeable por separado. Si quiero testear solo el Circuit Breaker, tengo que mockear `fetch`. Bonus: `catch (err: any)` en L109 — en un archivo que se vende como "nivel producción".

---

### 2.4. 🟡 MEDIO — `useRegistroTurno.ts`: 5 Responsabilidades en 1 Hook

| Archivo | Líneas | Ruta |
|---|---|---|
| `useRegistroTurno.ts` | 110 | `src/hooks/useRegistroTurno.ts` |

El hook gestiona:
1. Instanciación del repositorio
2. Estado del formulario
3. Validación de inputs
4. Sanitización de datos
5. Mapeo de errores HTTP a mensajes de usuario

Debería delegarse a use cases, validadores y mappers separados.

---

## 3. VIOLACIONES DRY (Don't Repeat Yourself)

---

### 3.1. 🔴 CRÍTICO — `page.tsx` y `dashboard/page.tsx`: ~80% Idénticos

**Archivos:** `frontend/src/app/page.tsx` (132 líneas) y `frontend/src/app/dashboard/page.tsx` (126 líneas)

Alguien hizo Ctrl+C → Ctrl+V y cambió dos strings. Ambos archivos:

1. Declaran `lastCountRef`, `audioEnabled`, `showToast` → **estado duplicado**
2. Implementan el **mismo** `useEffect` de inicialización de audio — **carácter por carácter idéntico**
3. Implementan el **mismo** `useEffect` de detección de cambio para reproducir sonido — **lógica gemela**
4. Renderizan el **mismo** indicador de conexión WebSocket, hint de audio, error y toast — **JSX gemelo**

**Solución obvia:** Un hook `useAudioNotification(turnos, filterFn)` + un layout component compartido. Pero nadie se molestó.

**Consecuencia directa:** Si cambias la lógica de audio mañana, lo haces en dos lugares. Si olvidas uno: bug silencioso.

---

### 3.2. 🟢 BAJO — Magic Numbers Duplicados

| Valor | Significado | Ubicaciones |
|---|---|---|
| `2600` | Duración del toast (ms) | `page.tsx` L58, `dashboard/page.tsx` L63 |
| `300` | Base backoff (ms) | `httpClient.ts` L153 |
| `3` | Multiplicador de cleanup | `proxi.ts` L24 |

Ninguno tiene nombre. Ninguno es configurable.

---

## 4. ARQUITECTURA HEXAGONAL DE CARTÓN (Ports & Adapters)

---

### 4.1. 🔴 CRÍTICO — Arquitectura Hexagonal que se Traiciona Sola

El frontend **sí** tiene la estructura de carpetas:

```
domain/       → Turno.ts, CrearTurno.ts
repositories/ → TurnoRepository.ts (interfaz), HttpTurnoRepository.ts (implementación)
services/     → AudioService.ts
hooks/        → useRegistroTurno.ts, useTurnosWebSocket.ts
```

Pero la ejecución se traiciona:

- **`domain/`**: Solo interfaces vacías. Cero comportamiento, cero validaciones, cero invariantes. Es un **modelo anémico disfrazado de dominio**. `Turno.ts` y `CrearTurno.ts` son DTOs con carpeta elegante.
- **`TurnoRepository` interface**: Existe, pero **nadie la usa como tipo**. Los hooks importan `HttpTurnoRepository` concreto.
- **`AudioService`**: Singleton global importado directamente. No hay port `NotificationSoundPort`.

Es como construir una casa con planos hexagonales, pero luego pasar los cables por fuera de las paredes porque "es más rápido".

---

### 4.2. 🟡 MEDIO — `TurnoRepository` Interface es Cosmética

| Archivo | Líneas | Ruta |
|---|---|---|
| `TurnoRepository.ts` | 10 | `src/repositories/TurnoRepository.ts` |

```typescript
export interface TurnoRepository {
    crearTurno(turno: CrearTurno): Promise<void>;
    obtenerTurnos(): Promise<Turno[]>;
}
```

Nadie depende de esta interfaz como tipo. Los hooks importan `HttpTurnoRepository` directamente. La interfaz es **código decorativo** — existe para aparentar.

---

## 5. VIOLACIONES OCP, LSP e ISP

---

### 5.1. 🟡 MEDIO — LSP: `Turno` del Frontend Incompleto vs Backend

| Archivo | Líneas | Ruta |
|---|---|---|
| `Turno.ts` | 15 | `src/domain/Turno.ts` |

No incluye `finAtencionAt`. El backend `TurnoEventPayload` sí. El frontend silenciosamente descarta este campo. Si un feature futuro necesita countdowns, el modelo de dominio está incompleto.

---

### 5.2. 🟡 MEDIO — ISP: `TurnoRepository` Interface Demasiado Amplia

| Archivo | Líneas | Ruta |
|---|---|---|
| `TurnoRepository.ts` | 10 | `src/repositories/TurnoRepository.ts` |

```typescript
export interface TurnoRepository {
    crearTurno(turno: CrearTurno): Promise<void>;
    obtenerTurnos(): Promise<Turno[]>;
}
```

`useTurnosRealtime` solo necesita `obtenerTurnos()`. `useRegistroTurno` solo necesita `crearTurno()`. Ambos dependen de la interfaz completa. Deberían existir interfaces segregadas: `TurnoCommandPort` y `TurnoQueryPort`.

---

## 6. SEGURIDAD INEXISTENTE

---

### 6.1. 🔴 CRÍTICO — `proxi.ts` NO ES Middleware Activo (Nombre Incorrecto)

| Archivo | Líneas | Ruta |
|---|---|---|
| `proxi.ts` | 93 | `src/proxi.ts` |

Next.js requiere que el middleware se llame exactamente `middleware.ts` en `/src/`. Este archivo se llama `proxi.ts`. A menos que exista un `middleware.ts` que lo re-exporte (no existe), **NADA de lo que este archivo contiene se ejecuta:**

- ❌ Rate limiting → **NO ACTIVO**
- ❌ Bloqueo de métodos HTTP → **NO ACTIVO**
- ❌ Headers de seguridad (CSP, XSS, etc.) → **NO ACTIVOS**

**Resultado:** El frontend se despliega SIN rate limiting, SIN headers de seguridad, SIN bloqueo de métodos. Todo el código de seguridad es **decorativo**.

---

### 6.2. 🔴 CRÍTICO — CSP Bloquearía WebSocket (Si Estuviera Activo)

**Archivo:** `frontend/src/proxi.ts` — L77

```
connect-src 'self'
```

El CSP permite conexiones solo a `'self'`. Pero `useTurnosWebSocket` conecta a `env.WS_URL` que es `http://localhost:3000` — un **origen diferente** al frontend en `:3001`. Si el middleware estuviera activo, **bloquearía la conexión WebSocket**.

Es un middleware que si no se activa, no protege. Y si se activa, **rompe la app**.

---

### 6.3. 🟡 MEDIO — `sanitize.ts`: Falsa Sensación de Seguridad

| Archivo | Líneas | Ruta |
|---|---|---|
| `sanitize.ts` | 7 | `src/security/sanitize.ts` |

```typescript
return input
    .replace(/[<>]/g, "")        // No protege contra javascript: URIs
    .replace(/script/gi, "")     // Bypasseable con "scrscriptipt"
    .trim();
```

7 líneas. No protege contra `on*` event handlers, inyección via atributos HTML, ni double-encoding. El directorio `security/` sugiere que el equipo **confía** en esto. Si lo hace, el sistema es vulnerable.

---

### 6.4. 🟡 MEDIO — Sin Validación de Longitud en Inputs del Frontend

| Archivo | Líneas | Ruta |
|---|---|---|
| `RegistroTurnoForm.tsx` | ~50 | `src/components/RegistroTurnoForm/RegistroTurnoForm.tsx` |

No hay `maxLength` en los inputs. Un usuario puede enviar megabytes de texto por el campo `nombre`. El sanitizer solo quita `<>` y `script` — no limita tamaño.

---

### 6.5. 🟡 MEDIO — Mock API Accesible en Producción

| Archivo | Líneas | Ruta |
|---|---|---|
| `route.ts` | ~20 | `src/app/api/mock/turnos/route.ts` |

Retorna datos falsos con `status: "queued"` (no coincide con respuestas reales). No hay guard de `NODE_ENV`. Este endpoint es deployable y reachable en `/api/mock/turnos` en producción. Un atacante podría usarlo para confundir herramientas de monitoreo.

---

## 7. ZERO TESTS, ZERO INFRAESTRUCTURA DE TESTS

---

### 7.1. 🔴 CRÍTICO — Frontend: ZERO Tests

| Métrica | Valor |
|---|---|
| Framework de testing | **Ninguno** (ni Jest, ni Vitest, ni Testing Library) |
| Script `test` en `package.json` | **No existe** |
| Archivos de test | **0** |
| `devDependencies` de testing | **Ninguna** |

El Consumer al menos tiene las dependencias de testing instaladas (aunque sin usar). El Frontend **ni siquiera tiene un test runner instalado**. Es imposible escribir un test sin primero instalar y configurar toda la infraestructura de testing.

---

## 8. CÓDIGO MUERTO

---

### 8.1. 🟡 MEDIO — `useTurnosRealtime.ts`: 95 Líneas que Nadie Importa

| Archivo | Líneas | Ruta |
|---|---|---|
| `useTurnosRealtime.ts` | 95 | `src/hooks/useTurnosRealtime.ts` |

Hook completo con lógica de polling + WebSocket. **Cero importers** en todo el proyecto. Es código muerto que además viola DIP (instancia `HttpTurnoRepository` directamente).

---

### 8.2. 🟡 MEDIO — `api/mock/turnos/route.ts`: Endpoint Falso Expuesto en Producción

| Archivo | Líneas | Ruta |
|---|---|---|
| `route.ts` | ~20 | `src/app/api/mock/turnos/route.ts` |

Retorna datos falsos sin guard de `NODE_ENV`. Deployable en producción. Ver sección de seguridad (6.5).

---

### 8.3. 🟡 MEDIO — `TurnoRepository` Interface: Código Decorativo

Nadie la usa como tipo. Los hooks importan la implementación concreta. La interfaz existe para aparentar arquitectura hexagonal.

---

## Autopsia — Tabla de Archivos

| Archivo | Líneas | Violaciones |
|---|---|---|
| `app/page.tsx` | 132 | SRP (4 responsabilidades), DRY (80% duplicado con dashboard) |
| `app/dashboard/page.tsx` | 126 | SRP (4 responsabilidades), DRY (80% duplicado con page) |
| `hooks/useRegistroTurno.ts` | 110 | DIP (ignora interfaz), SRP (5 responsabilidades en 1 hook) |
| `hooks/useTurnosWebSocket.ts` | 93 | DIP (Socket.IO directo), Clean (6x console.log sin NODE_ENV guard) |
| `hooks/useTurnosRealtime.ts` | 95 | **CÓDIGO MUERTO** + DIP (nadie lo importa) |
| `lib/httpClient.ts` | 175 | SRP (CB + Retry + Timeout), Clean (`err: any`) |
| `proxi.ts` | 93 | SRP (3 responsabilidades), **NOMBRE INCORRECTO** → middleware inactivo |
| `repositories/TurnoRepository.ts` | 10 | **NADIE LA USA** como tipo — interfaz cosmética |
| `domain/Turno.ts` | 15 | Hex (anémica — solo interface, zero comportamiento) |
| `domain/CrearTurno.ts` | 15 | Hex (anémica — solo interface, zero comportamiento) |
| `services/AudioService.ts` | 80 | DIP (singleton global) |
| `security/sanitize.ts` | 7 | Seguridad (bypasseable, naïve) |
| `api/mock/turnos/route.ts` | ~20 | **CÓDIGO MUERTO** expuesto en producción |
| `config/env.ts` | 29 | DIP menor (process.env directo, no inyectable) |
| `app/layout.tsx` | ~20 | Clean ("Generated by create next app" en metadata) |
| Tests | — | **ZERO** (ni test runner instalado) |

---

## Mapa Visual de la Catástrofe

```
┌─── FRONTEND (Next.js) ─── TESTS: 0 ─── TEST RUNNER: NO INSTALADO ────┐
│                                                                        │
│  page.tsx ──────┐ 80% COPY-PASTE   proxi.ts ── ¡NOMBRE MAL!          │
│  dashboard/ ────┘ (4 responsab.)    ↓ Rate Limit + CSP + Methods      │
│                                     ↓ NADA SE EJECUTA EN PRODUCCIÓN   │
│  hooks/                                                                │
│   useRegistroTurno ── new HttpTurnoRepo() ←── IGNORA LA INTERFAZ     │
│   useTurnosWebSocket ── io() directo ←── SIN ABSTRACCIÓN             │
│   useTurnosRealtime ── 🧟 CÓDIGO MUERTO (95 líneas)                  │
│                                                                        │
│  domain/Turno.ts ── interface vacía ←── MODELO ANÉMICO               │
│  repositories/TurnoRepository.ts ── NADIE LA USA                      │
│  api/mock/turnos/ ── 🧟 CÓDIGO MUERTO EXPUESTO EN PROD               │
│  httpClient.ts ── CB+Retry+Timeout en 175 líneas ←── SRP             │
│                                                                        │
└── SIN RATE LIMITING ACTIVO ── SIN HEADERS DE SEGURIDAD ──────────────┘
```

---

## Plan de Resurrección — Frontend

### FASE 0 — TRIAGE DE EMERGENCIA

| # | Acción | Impacto | Esfuerzo |
|---|---|---|---|
| 0.1 | **Renombrar `proxi.ts` → `middleware.ts`** y validar que Next.js lo detecte. Corregir CSP `connect-src` para incluir el WS_URL. | 🔴 Seguridad activa | 1h |
| 0.2 | **Eliminar código muerto**: `useTurnosRealtime.ts`, `api/mock/turnos/route.ts`. | 🟡 Limpieza | 1h |
| 0.3 | **Instalar test runner** (Vitest + Testing Library). | 🔴 Fundacional | 4h |
| 0.4 | **Corregir metadata** de `layout.tsx` (quitar "Generated by create next app"). | 🟢 Clean | 5min |

### FASE 3 — DESCOMPONER SERVICIOS OBESOS

| # | Acción | Responsabilidades Extraídas |
|---|---|---|
| 3.6 | **Descomponer `httpClient.ts`** en `CircuitBreakerService`, `RetryService`, `TimeoutService`. | SRP |
| 3.7 | **Extraer `useAudioNotification` hook** para eliminar duplicación page↔dashboard. | SRP + DRY |
| 3.8 | **Extraer error mapper** de `useRegistroTurno` a `errorMessageMapper.ts`. | SRP |

### FASE 4 — FRONTEND HEXAGONAL REAL

> *Hacerle honor a las carpetas que ya existen.*

| # | Acción | Impacto |
|---|---|---|
| 4.1 | **Enriquecer modelos de dominio** (`Turno.ts`, `CrearTurno.ts`) con validaciones y comportamiento (no solo interfaces vacías). | Hex |
| 4.2 | **Segregar `TurnoRepository`** en `TurnoCommandPort` y `TurnoQueryPort`. | ISP |
| 4.3 | **Crear `IRealTimePort`** para abstraer WebSocket/SSE/Polling. | DIP |
| 4.4 | **Crear `IAudioPort`** para abstraer AudioService. | DIP |
| 4.5 | **Inyectar todas las abstracciones** en hooks via React Context o factory. | DIP |
| 4.6 | **Hooks dependen solo de interfaces**, nunca de clases concretas. | DIP |
| 4.7 | **Reescribir `sanitize.ts`** con DOMPurify o equivalente serio. | Seguridad |
| 4.8 | Escribir tests para hooks y componentes usando mocks de los ports. | Testing |

### FASE 6 — COBERTURA DE TESTS REAL

| # | Acción | Objetivo |
|---|---|---|
| 6.3 | Tests unitarios para **todos los hooks** del Frontend (con mocks de ports). | >80% coverage |

---

## Conclusión Hostil

El Frontend es una **fachada hexagonal** — carpetas elegantes, interfaces decorativas, y un nivel de acoplamiento propio de un prototipo de hackathon. La cereza del pastel: un archivo de seguridad que **no se ejecuta** porque alguien lo llamó `proxi.ts` en vez de `middleware.ts`.

El resultado: un frontend desplegado en producción **sin rate limiting, sin headers de seguridad, sin tests, con código muerto expuesto como endpoint, con un sanitizer de 7 líneas bypasseable con `scrscriptipt`, y con dos páginas que son 80% copy-paste.**

Si la interfaz `TurnoRepository` pudiera hablar, diría: *"Me crearon para quedar bien en el code review. Nadie me usa."*

**Grado de deuda técnica Frontend:** 9/10.
