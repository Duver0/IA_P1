# TEST_PLAN.md — Plan de Pruebas Técnico
## Sistema de Turnos Médicos en Tiempo Real — IA_P1

> **Versión:** 1.1  
> **Fecha:** 4 de marzo de 2026  
> **Equipo:** Backend (Producer + Consumer) | Frontend  
> **Stack:** NestJS · Next.js · MongoDB · RabbitMQ · Docker  
> **Rama activa:** `feature/devops-testing-multinivel`

> **✅ Estado del documento:** Scripts `test:component` / `test:integration` validados localmente (Producer 19/19 · Consumer 13/13 · Frontend 111/111). Pipeline CI/CD refactorizado en 5 jobs. Pendiente: Dockerfiles no-root (B1, B2, F1) y prueba Caja Negra HTTP (B4).

---

## 1. Introducción y Scope

### 1.1 Propósito

Este documento define el Plan de Pruebas técnico del sistema de turnos médicos en tiempo real. Establece la estrategia de testing multinivel adoptada, justifica las decisiones bajo los 7 Principios del Testing, describe los Test Suites de cada servicio y detalla los Test Cases diseñados para garantizar la calidad del sistema antes de cada release.

### 1.2 Alcance del Sistema

| Servicio | Descripción |
|---|---|
| **Producer** | API HTTP (`POST /turnos`, `GET /turnos`, `GET /turnos/:cedula`), WebSocket gateway, autenticación JWT |
| **Consumer** | Worker RabbitMQ, scheduler de asignación de consultorio, persistencia MongoDB |
| **Frontend** | Interfaz Next.js: registro de turno, portal autenticado, notificaciones en tiempo real |

### 1.3 Fuera de Scope

- Pruebas de carga / performance
- Pruebas de penetración (seguridad ofensiva)
- Pruebas de usuario final (UX research)

---

## 2. Estrategia Multinivel

La estrategia sigue la pirámide de testing clásica adaptada al contexto de microservicios:

```
         /‾‾‾‾‾‾‾‾‾‾\
        /  E2E (futuro)\
       /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
      /  Integración     \    ← tests/infrastructure + tests/presentation (HTTP real)
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /  Componente          \  ← tests/domain + tests/application (aislados, sin I/O)
   /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

### 2.1 Pruebas de Componente — Caja Blanca

**Definición:** Pruebas que verifican la lógica interna de módulos aislados (entidades de dominio y casos de uso) sin ninguna conexión a infraestructura real. El desarrollador conoce la estructura interna del código — rutas de ejecución, ramas `if/else`, interacciones entre puertos.

**Características en este proyecto:**
- No levantan servidor HTTP
- No conectan a RabbitMQ ni MongoDB
- Usan mocks/stubs de los puertos definidos en `domain/ports/`
- Verifican explícitamente que los puertos fueron llamados con los argumentos correctos
- Corren en milisegundos

**Comando:** `npm run test:component`

**Archivos incluidos:**
- `test/domain/**`
- `test/application/**`
- `__tests__/hooks/**`
- `__tests__/components/**`

### 2.2 Pruebas de Integración — Caja Negra

**Definición:** Pruebas que verifican el comportamiento observable del sistema (respuestas HTTP, estados, efectos secundarios) sin exponer ni depender de la implementación interna. El tester solo interactúa con la interfaz pública — endpoints, renders de componentes, salidas del DOM.

**Características en este proyecto:**
- Levantan un `TestingModule` completo de NestJS con adaptadores reales o in-memory
- Usan `supertest` para llamar a endpoints HTTP reales
- En frontend, renderizan páginas completas con providers reales
- Verifican respuestas HTTP (status codes, body), no implementaciones
- Más lentas; se ejecutan después de las de componente en el pipeline

**Comando:** `npm run test:integration`

**Archivos incluidos:**
- `test/infrastructure/**`
- `test/presentation/**`
- `test/scheduler/**`
- `test/notifications/**`
- `__tests__/infrastructure/**`
- `__tests__/providers/**`
- `__tests__/app/**`

---

## 3. Los 7 Principios de las Pruebas — Aplicados al Proyecto

### Principio 1 — Las pruebas demuestran la presencia de defectos, no su ausencia

**Aplicación en el proyecto:** El pipeline CI/CD siempre muestra el porcentaje de cobertura como métrica orientativa, nunca como indicador de "el sistema está libre de bugs". Por ejemplo, el hecho de que `CreateTurnoUseCase` tenga 100% de cobertura no garantiza que la integración con RabbitMQ en producción funcione correctamente. Por eso mantenemos pruebas de componente Y de integración: cada nivel detecta defectos que el otro no puede.

### Principio 2 — Las pruebas exhaustivas son imposibles

**Aplicación en el proyecto:** Para el endpoint `POST /turnos`, los valores de `cedula` (entero largo), `nombre` (texto libre) y `priority` (enum) generan un espacio de entradas prácticamente infinito. En lugar de intentar cubrir todos los valores, aplicamos **partición de equivalencias** y **análisis de valores límite**: testeamos `priority: 'alta'`, `priority: 'media'`, `priority: 'baja'`, un campo faltante y un tipo inválido — cubriendo las particiones relevantes sin escalar los tests infinitamente.

### Principio 3 — Las pruebas tempranas ahorran tiempo y dinero (Shift-Left)

**Aplicación en el proyecto:** Las pruebas de componente (Caja Blanca) se definen junto con el diseño de los puertos hexagonales, antes de que existan adaptadores de infraestructura reales. Por ejemplo, `CreateTurnoUseCase` fue probado contra `IEventPublisher` (interfaz) mucho antes de que `RabbitMQEventPublisherAdapter` existiera. Esto permitió detectar problemas de contrato en el dominio de forma extremadamente barata.

### Principio 4 — Agrupación de defectos (Defect Clustering)

**Aplicación en el proyecto:** La experiencia del proyecto muestra que la mayoría de los defectos se concentran en la capa de infraestructura — específicamente en los adaptadores de RabbitMQ y en la transformación de documentos Mongoose a entidades de dominio. Por eso el 60% de los casos de prueba de integración cubre `infrastructure/adapters/`. Esta concentración justifica mayor profundidad de test en esa capa específica.

### Principio 5 — La paradoja del pesticida

**Aplicación en el proyecto:** Para evitar que los tests existentes pierdan efectividad al adaptarse el código, rotamos la estrategia de pruebas en cada iteración. En la Semana 3 incorporamos pruebas de Caja Negra via HTTP (supertest en producer) que no existían antes — la misma lógica que antes solo era probada con mocks de puertos ahora también se verifica a través de la interfaz HTTP real, ejercitando nuevas rutas de ejecución.

### Principio 6 — Las pruebas dependen del contexto (Context-Dependent Testing)

**Aplicación en el proyecto:** Este es el principio más relevante para nuestra arquitectura de microservicios:

- **Producer:** Contexto de API pública con autenticación JWT. Las pruebas priorizan la validación de contratos HTTP, seguridad de rutas protegidas y publicación correcta de eventos. No tendría sentido aplicar la misma intensidad a pruebas de base de datos porque el Producer no persiste directamente.
- **Consumer:** Contexto de worker asíncrono con scheduler. Las pruebas priorizan el manejo correcto de `ack/nack` de mensajes, la lógica de asignación de consultorios y la idempotencia. No tendría sentido probar HTTP aquí porque el Consumer no expone API pública.
- **Frontend:** Contexto de interfaz de usuario con WebSocket en tiempo real. Las pruebas priorizan el comportamiento reactivo de los hooks y la experiencia de los flujos de usuario. No se prueban detalles de implementación del servidor.

El contexto de ser un sistema médico también impacta: los fallos de estado de turno (`espera` → `llamado` → `atendido`) tienen consecuencias reales para los pacientes, por lo que esa máquina de estados está cubierta en múltiples niveles.

### Principio 7 — La falacia de la ausencia de errores

**Aplicación en el proyecto:** El sistema puede pasar todos los tests actuales y aún así no ser útil si, por ejemplo, el frontend muestra los turnos en un orden diferente al esperado por el staff médico, o si el tiempo de respuesta del scheduler es muy alto para la carga real de pacientes. La cobertura del 90%+ en backend no garantiza que el sistema satisfaga los objetivos del negocio. Por eso el TEST_PLAN incluye criterios de aceptación funcionales además de criterios técnicos de cobertura.

---

## 4. Test Suites

### 4.1 Backend — Producer

| Suite | Capa | Tipo | Técnica | Archivos |
|---|---|---|---|---|
| `Turno Entity` | Domain | Componente | Caja Blanca | `test/domain/turno.entity.spec.ts` |
| `CreateTurnoUseCase` | Application | Componente | Caja Blanca | `test/application/create-turno.use-case.spec.ts` |
| `GetAllTurnosUseCase` | Application | Componente | Caja Blanca | `test/application/get-all-turnos.use-case.spec.ts` |
| `GetTurnosByCedulaUseCase` | Application | Componente | Caja Blanca | `test/application/get-turnos-by-cedula.use-case.spec.ts` |
| `LoginUseCase` | Application | Componente | Caja Blanca | `test/application/auth/login.use-case.spec.ts` |
| `SignupUseCase` | Application | Componente | Caja Blanca | `test/application/auth/signup.use-case.spec.ts` |
| `TurnoMongooseAdapter` | Infrastructure | Integración | Caja Negra | `test/infrastructure/turno-mongoose.adapter.spec.ts` |
| `RabbitMQEventPublisherAdapter` | Infrastructure | Integración | Caja Negra | `test/infrastructure/rabbitmq-event-publisher.adapter.spec.ts` |
| `HmacTokenService` | Infrastructure | Integración | Caja Blanca/Negra | `test/infrastructure/hmac-token.service.spec.ts` |
| `ScryptPasswordHasher` | Infrastructure | Integración | Caja Blanca/Negra | `test/infrastructure/scrypt-password-hasher.adapter.spec.ts` |
| `ProducerController` | Presentation | Integración | Caja Negra (HTTP) | `test/presentation/producer.controller.spec.ts` |
| `AuthController` | Presentation | Integración | Caja Negra (HTTP) | `test/presentation/auth.controller.spec.ts` |
| `AuthGuard` | Presentation | Componente | Caja Blanca | `test/presentation/auth.guard.spec.ts` |
| `TurnosGateway (WS)` | Presentation | Integración | Caja Negra | `test/presentation/turnos.gateway.spec.ts` |
| `Turnos Blackbox API` | Presentation | Integración E2E | **Caja Negra** | `test/presentation/turnos.blackbox.spec.ts` ❌ **pendiente — B4** |

### 4.2 Backend — Consumer

| Suite | Capa | Tipo | Técnica | Archivos |
|---|---|---|---|---|
| `Turno Entity` | Domain | Componente | Caja Blanca | `test/domain/turno.entity.spec.ts` |
| `CreateTurnoUseCase` | Application | Componente | Caja Blanca | `test/application/create-turno.use-case.spec.ts` |
| `AssignRoomUseCase` | Application | Componente | Caja Blanca | `test/application/assign-room.use-case.spec.ts` |
| `FinalizeTurnosUseCase` | Application | Componente | Caja Blanca | `test/application/finalize-turnos.use-case.spec.ts` |
| `StandardPrioritySorting` | Infrastructure | Integración | Caja Blanca | `test/infrastructure/standard-priority-sorting.strategy.spec.ts` |
| `TurnoMongooseAdapter` | Infrastructure | Integración | Caja Negra | `test/infrastructure/turno-mongoose.adapter.spec.ts` |
| `RabbitMQEventPublisherAdapter` | Infrastructure | Integración | Caja Negra | `test/infrastructure/rabbitmq-event-publisher.adapter.spec.ts` |
| `ConsumerController` | Presentation | Integración | Caja Negra | `test/presentation/consumer.controller.spec.ts` |
| `SchedulerService` | Scheduler | Integración | Caja Blanca | `test/scheduler/scheduler.service.spec.ts` |
| `NotificationsService` | Notifications | Integración | Caja Negra | `test/notifications/notifications.service.spec.ts` |

### 4.3 Frontend

| Suite | Capa | Tipo | Técnica | Archivos |
|---|---|---|---|---|
| `useAudioNotification` | Hooks | Componente | Caja Blanca | `__tests__/hooks/useAudioNotification.spec.ts` |
| `useCreateTicket` | Hooks | Componente | Caja Blanca | `__tests__/hooks/useCreateTicket.spec.ts` |
| `useTicketsWebSocket` | Hooks | Componente | Caja Blanca | `__tests__/hooks/useTicketsWebSocket.spec.ts` |
| `BrowserAudioAdapter` | Infrastructure | Integración | Caja Negra | `__tests__/infrastructure/adapters/BrowserAudioAdapter.spec.ts` |
| `HtmlSanitizer` | Infrastructure | Componente | Caja Blanca | `__tests__/infrastructure/adapters/HtmlSanitizer.spec.ts` |
| `HttpAuthAdapter` | Infrastructure | Integración | Caja Negra | `__tests__/infrastructure/adapters/HttpAuthAdapter.spec.ts` |
| `HttpTicketAdapter` | Infrastructure | Integración | Caja Negra | `__tests__/infrastructure/adapters/HttpTicketAdapter.spec.ts` |
| `NoopAuthAdapter` | Infrastructure | Componente | Caja Blanca | `__tests__/infrastructure/adapters/NoopAuthAdapter.spec.ts` |
| `SocketIOAdapter` | Infrastructure | Integración | Caja Negra | `__tests__/infrastructure/adapters/SocketIOAdapter.spec.ts` |
| `CookieUtils` | Infrastructure | Componente | Caja Blanca | `__tests__/infrastructure/cookies/cookieUtils.spec.ts` |
| `CircuitBreaker` | Infrastructure | Componente | Caja Blanca | `__tests__/infrastructure/http/CircuitBreaker.spec.ts` |
| `HttpClient` | Infrastructure | Integración | Caja Negra | `__tests__/infrastructure/http/httpClient.spec.ts` |
| `AuthMapper` | Infrastructure | Componente | Caja Blanca | `__tests__/infrastructure/mappers/authMapper.spec.ts` |
| `TicketMapper` | Infrastructure | Componente | Caja Blanca | `__tests__/infrastructure/mappers/ticketMapper.spec.ts` |

---

## 5. Test Cases

### 5.1 TC-PROD-001 — CreateTurnoUseCase publica evento correctamente

| Campo | Valor |
|---|---|
| **ID** | TC-PROD-001 |
| **Suite** | CreateTurnoUseCase |
| **Tipo** | Componente / Caja Blanca |
| **Precondición** | Puerto `IEventPublisher` mockeado |
| **Entrada** | `{ cedula: 123, nombre: 'Paciente Test', priority: 'alta' }` |
| **Pasos** | 1. Instanciar `CreateTurnoUseCase` con mock de publisher. 2. Llamar `execute(data)`. |
| **Resultado Esperado** | `publisher.publish` llamado con `('crear_turno', data)`. Retorna `{ status: 'accepted', message: '...' }` |
| **Técnica** | Caja Blanca — se verifica la llamada interna al puerto |

### 5.2 TC-PROD-002 — CreateTurnoUseCase propaga error del broker

| Campo | Valor |
|---|---|
| **ID** | TC-PROD-002 |
| **Suite** | CreateTurnoUseCase |
| **Tipo** | Componente / Caja Blanca |
| **Precondición** | Publisher configurado para lanzar excepción |
| **Entrada** | `{ cedula: 123, nombre: 'Test' }` |
| **Pasos** | 1. Configurar mock para lanzar `Error('RabbitMQ connection lost')`. 2. Llamar `execute(data)`. |
| **Resultado Esperado** | La excepción se propaga al caller sin ser capturada por el use case |
| **Técnica** | Caja Blanca — se verifica el flujo de error interno |

### 5.3 TC-PROD-003 — POST /turnos responde 202 Accepted (Caja Negra)

| Campo | Valor |
|---|---|
| **ID** | TC-PROD-003 |
| **Suite** | Turnos Blackbox API |
| **Tipo** | Integración / **Caja Negra** |
| **Precondición** | `TestingModule` NestJS levantado con adaptadores en memoria |
| **Entrada** | `POST /turnos` con body `{ cedula: 12345, nombre: 'Paciente Test', priority: 'alta' }` |
| **Pasos** | 1. Levantar app con supertest. 2. Enviar request HTTP real. 3. Verificar respuesta. |
| **Resultado Esperado** | HTTP 202. Body contiene `{ status: 'accepted' }`. NO se accede a nada interno del use case. |
| **Técnica** | **Caja Negra** — solo se observa la interfaz externa HTTP |

### 5.4 TC-PROD-004 — POST /turnos rechaza payload inválido

| Campo | Valor |
|---|---|
| **ID** | TC-PROD-004 |
| **Suite** | Turnos Blackbox API |
| **Tipo** | Integración / Caja Negra |
| **Precondición** | App levantada con supertest |
| **Entrada** | `POST /turnos` sin campo `cedula` |
| **Pasos** | 1. Enviar request con payload incompleto. 2. Verificar respuesta. |
| **Resultado Esperado** | HTTP 400. Body contiene mensaje de error de validación. |
| **Técnica** | Caja Negra — validación observable en la interfaz HTTP |

### 5.5 TC-PROD-005 — GET /turnos retorna lista

| Campo | Valor |
|---|---|
| **ID** | TC-PROD-005 |
| **Suite** | Turnos Blackbox API |
| **Tipo** | Integración / Caja Negra |
| **Precondición** | App levantada. Repositorio in-memory con 2 turnos. |
| **Entrada** | `GET /turnos` sin parámetros |
| **Pasos** | 1. Enviar request. 2. Verificar respuesta. |
| **Resultado Esperado** | HTTP 200. Body es un array con exactamente 2 elementos. |
| **Técnica** | Caja Negra |

### 5.6 TC-CONS-001 — AssignRoomUseCase asigna consultorio disponible

| Campo | Valor |
|---|---|
| **ID** | TC-CONS-001 |
| **Suite** | AssignRoomUseCase |
| **Tipo** | Componente / Caja Blanca |
| **Precondición** | Puerto `ITurnoRepository` mockeado con 1 turno en estado `espera` |
| **Entrada** | `execute()` sin argumentos |
| **Pasos** | 1. Mock retorna turno en espera. 2. Llamar `execute()`. |
| **Resultado Esperado** | `repository.update` llamado con el turno en estado `llamado` y consultorio asignado |
| **Técnica** | Caja Blanca — se verifica la mutación interna del estado |

### 5.7 TC-CONS-002 — SchedulerService llama al use case periódicamente

| Campo | Valor |
|---|---|
| **ID** | TC-CONS-002 |
| **Suite** | SchedulerService |
| **Tipo** | Integración / Caja Blanca |
| **Precondición** | Use case mockeado |
| **Entrada** | Trigger manual del scheduler |
| **Pasos** | 1. Llamar el método del scheduler. 2. Verificar delegación. |
| **Resultado Esperado** | Use case `execute` fue llamado exactamente una vez |
| **Técnica** | Caja Blanca — se verifica el flujo de delegación interno |

### 5.8 TC-FE-001 — useCreateTicket llama al puerto con los datos correctos

| Campo | Valor |
|---|---|
| **ID** | TC-FE-001 |
| **Suite** | useCreateTicket |
| **Tipo** | Componente / Caja Blanca |
| **Precondición** | Puerto `ITicketService` mockeado via DependencyProvider |
| **Entrada** | Llamada a `createTicket({ cedula: 123, nombre: 'Test', priority: 'media' })` |
| **Pasos** | 1. Renderizar hook con mock del puerto. 2. Llamar función del hook. |
| **Resultado Esperado** | El puerto es llamado con exactamente los datos proporcionados |
| **Técnica** | Caja Blanca — se verifica interacción interna del hook con su dependencia |

### 5.9 TC-FE-002 — CircuitBreaker abre después de N fallos consecutivos

| Campo | Valor |
|---|---|
| **ID** | TC-FE-002 |
| **Suite** | CircuitBreaker |
| **Tipo** | Componente / Caja Blanca |
| **Precondición** | CircuitBreaker instanciado con threshold 3 |
| **Entrada** | 3 llamadas fallidas consecutivas + 1 llamada más |
| **Pasos** | 1. Forzar 3 fallos. 2. Intentar 4a llamada. |
| **Resultado Esperado** | 4a llamada lanza `CircuitOpenError` sin ejecutar la función subyacente |
| **Técnica** | Caja Blanca — se verifica el estado interno del circuit breaker |

### 5.10 TC-FE-003 — HttpAuthAdapter realiza POST /auth/login correctamente

| Campo | Valor |
|---|---|
| **ID** | TC-FE-003 |
| **Suite** | HttpAuthAdapter |
| **Tipo** | Integración / Caja Negra |
| **Precondición** | `fetch` mockeado para retornar token válido |
| **Entrada** | `login({ email: 'test@test.com', password: '1234' })` |
| **Pasos** | 1. Llamar `login`. 2. Verificar que fetch fue llamado con el endpoint correcto. |
| **Resultado Esperado** | Retorna `AuthCredentials` con token. `fetch` llamado con método `POST` y body correcto. |
| **Técnica** | Caja Negra — se verifica comportamiento observable sin acceder a internals del adapter |

---

## 6. Criterios de Aceptación y Definición de Done

### 6.1 Criterios de Aceptación por Nivel

| Nivel | Criterio de Aceptación |
|---|---|
| **Componente** | 100% de los tests pasan. Sin dependencias de red o disco. Ejecución < 10s total. |
| **Integración** | 100% de los tests pasan. Reportes de cobertura generados. Ejecución < 60s total. |
| **Pipeline** | Jobs de componente e integración pasan en verde antes de cualquier merge a `develop` o `main`. Escaneo Trivy sin vulnerabilidades CRITICAL ni HIGH. |

### 6.2 Umbrales de Cobertura Mínima

| Servicio | Mínimo Lines | Mínimo Branches |
|---|---|---|
| Producer | 80% | 70% |
| Consumer | 80% | 70% |
| Frontend | 70% | 60% |

### 6.3 Definición de Done para una Feature

Una feature se considera terminada cuando:
1. Todos los tests de componente e integración relacionados pasan
2. El pipeline CI/CD corre en verde en el PR hacia `develop`
3. No se introducen nuevas vulnerabilidades CRITICAL en las imágenes Docker
4. La cobertura no baja del umbral mínimo establecido
5. Los Test Cases relevantes en este documento están actualizados

---

## 7. Herramientas y Entorno

| Herramienta | Versión | Propósito |
|---|---|---|
| Jest | ^29 (backend) / ^30 (frontend) | Runner de pruebas |
| Supertest | ^6 | Pruebas HTTP reales (Caja Negra) |
| @nestjs/testing | ^10 | TestingModule para pruebas de integración NestJS |
| @testing-library/react | ^16 | Renderizado de componentes React |
| ts-jest | ^29 | Compilación TypeScript en pruebas |
| Trivy | latest | Escaneo de vulnerabilidades de imágenes Docker |
| GitHub Actions | — | Orquestación del pipeline CI/CD |
| Docker / Docker Compose | — | Entorno de contenedores |

### 7.1 Ejecución Local

```bash
# Backend Producer
cd backend/producer
npm run test:component    # solo domain/ y application/
npm run test:integration  # solo infrastructure/ y presentation/
npm run test:cov          # reporte completo de cobertura

# Backend Consumer
cd backend/consumer
npm run test:component
npm run test:integration
npm run test:cov

# Frontend
cd frontend
npm run test:component
npm run test:integration
npm run test:coverage
```

### 7.2 Estructura de Jobs en el Pipeline

```
lint → component-tests → integration-tests → build → docker-scan
```

Cada job bloquea al siguiente. Un fallo en `component-tests` impide ejecutar `integration-tests`, siguiendo el Principio 3 (Shift-Left): los errores más baratos de detectar se detectan primero.
