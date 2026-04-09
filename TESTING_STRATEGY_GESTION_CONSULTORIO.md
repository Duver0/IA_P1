# TESTING_STRATEGY_GESTION_CONSULTORIO.md

Documento de consolidacion de la estrategia de pruebas para la feature de gestion de consultorio y sesion medica, ya implementada en el sistema.

Fecha de corte: 2026-04-06
Estado: Implementado y validado en CI

---

## 1) Objetivo

Definir una estrategia de pruebas trazable para confirmar que el flujo medico cumple reglas de negocio y contratos tecnicos, desde autenticacion por rol hasta cierre de atencion y liberacion de consultorio.

---

## 2) Alcance funcional de la feature

La estrategia cubre las capacidades implementadas:

- Autenticacion y autorizacion por rol medico.
- Toma y liberacion de consultorio por medico autenticado.
- Gestion de disponibilidad del medico.
- Inicio y finalizacion manual de atencion.
- Sincronizacion de estado en tiempo real (consultorio y turno).
- Bloqueo de acciones invalidas segun estado.
- Manejo de comandos con idempotencia por commandId.

Fuera de alcance en este documento:

- Pruebas de carga y estres.
- Pruebas visuales de UI no funcionales.
- Benchmark de rendimiento de infraestructura.

---

## 3) Enfoque de calidad

Se aplica el principio: verificar primero (correctitud tecnica), validar despues (reglas de negocio).

- Verificar: contratos por capa y transiciones de estado validas/invalidas.
- Validar: recorrido real del medico, restricciones de acceso y coherencia del flujo operativo.

---

## 4) Estrategia por niveles

### 4.1 Nivel 1 - White-Box (regla aislada)

Objetivo: asegurar reglas criticas en unidades acotadas.

Cobertura esperada:

- Dominio y mapeo de payload de turnos.
- Casos de uso de comandos medicos.
- DTOs y validaciones de entrada.
- Adaptadores de persistencia y estado de consultorio.

### 4.2 Nivel 2 - Component tests (frontend y capas aisladas)

Objetivo: validar comportamiento funcional en componentes y modulos con dependencias mockeadas.

Cobertura esperada:

- Vista medico y acciones por estado.
- AuthGuard, Provider de autenticacion y rutas protegidas.
- Adaptadores HTTP y mappers.
- Mensajeria de UI para acciones permitidas y bloqueadas.

### 4.3 Nivel 3 - Integration tests (black-box tecnico)

Objetivo: validar integracion entre capas y contratos de infraestructura.

Cobertura esperada:

- Producer: controladores, gateway y bus de eventos realtime.
- Consumer: procesamiento de eventos, estados y consistencia operativa.
- Frontend: adaptadores de infraestructura en integracion.

### 4.4 Nivel 4 - Acceptance (black-box de negocio)

Objetivo: comprobar escenarios completos orientados a negocio.

Cobertura esperada:

- Flujo de ingreso medico -> toma consultorio -> atencion -> finalizacion -> liberacion.
- Rechazo de acceso sin rol medico.
- Bloqueo de acciones fuera de secuencia.
- Escenarios de no disponibilidad sin romper atencion activa.

### 4.5 Matriz de la piramide y ubicacion de pruebas actuales

La siguiente tabla ubica las pruebas actuales dentro de la piramide y explicita si se ejecutan como caja blanca o caja negra.

| Nivel de piramide | Objetivo tecnico | Donde estan hoy las pruebas | Tipo de caja dominante | Enfoque (Verificacion / Validacion) | Estado actual |
|---|---|---|---|---|---|
| Base: Unitarias de dominio y casos de uso | Validar reglas internas y decisiones de estado | Core backend: pruebas de `domain` y `application` en producer/consumer. Ejemplo: transiciones de `ConsultorioSession` e idempotencia por `commandId`. | Caja Blanca | Verificacion | Alto |
| Segundo nivel: Component y capa aislada | Validar comportamiento funcional de componentes/modulos aislados con dependencias controladas | Frontend: suites de `components`, `hooks`, `providers`, `app`. Backend: presentacion con dobles en controladores/guards. | Mixto (Blanca + Negra local) | Verificacion + Validacion parcial | Alto |
| Tercer nivel: Integracion tecnica (adaptadores/contratos) | Validar contrato entre capa de aplicacion e infraestructura | Suites `infrastructure` en producer/consumer y adaptadores frontend. CI: jobs `integration-tests-*`. | Caja Negra tecnica (con instrumentacion) | Verificacion | Medio-Alto |
| Cima: E2E UI de negocio | Validar flujo observable del medico en experiencia real | Repos externos: `AUTO_FRONT_POM_FACTORY` y `AUTO_FRONT_SCREENPLAY`. | Caja Negra | Validacion | Alto |
| Cima: E2E API de negocio | Validar ciclo de vida por contratos REST sin UI | Repo externo: `AUTO_API_SCREENPLAY`. | Caja Negra | Validacion | Alto |

Notas:

- En CI del core, acceptance de producer se ejecuta como `bun run --if-present test:acceptance`.
- En la piramide objetivo se mantiene mayor densidad en base (unitarias), menor en cima (E2E).

### 4.6 Matriz HU y criterios de aceptacion: verificacion vs validacion

La tabla clasifica cada HU y criterios clave segun el foco principal: verificacion (correctitud tecnica) o validacion (valor observable de negocio).

| HU | Criterio de aceptacion resumido | Clasificacion principal | Tipo de prueba recomendado | Tecnica de diseno dominante | Archivo(s) de evidencia real |
|---|---|---|---|---|---|
| HU-01 Autenticacion | Acceso permitido solo con credenciales validas y rol medico | Verificacion + Validacion | Unit + Integracion + E2E | Particion de equivalencia (credenciales validas/invalidas), tabla de decision por rol | `backend/producer/src/presentation/auth.controller.ts`<br>`backend/producer/src/presentation/roles.guard.ts` |
| HU-01 Autenticacion | Rechazo de credenciales invalidas | Verificacion | Unit + Integracion | Valores limite de entrada (vacio, espacios, formato invalido, longitud minima) | `backend/producer/src/application/use-cases/login.use-case.ts` |
| HU-01 Autenticacion | Rechazo de usuario sin rol medico | Validacion | E2E UI/API + Integracion | Tabla de decision por roles (medico, empleado, admin, no autorizado) | `backend/producer/src/presentation/roles.guard.ts`<br>`frontend/src/components/AuthGuard/AuthGuard.tsx` |
| HU-02 Vinculacion | Medico se vincula a consultorio libre | Verificacion + Validacion | Integracion + E2E | Transicion de estados (SinMedico -> ConMedicoDisponible) | `backend/producer/src/presentation/medical.controller.ts`<br>`backend/consumer/src/application/use-cases/assign-doctor-to-consultorio.use-case.ts` |
| HU-02 Vinculacion | Se bloquea consultorio ocupado | Verificacion | Unit + Integracion | Particion de equivalencia (libre/ocupado), transicion invalida | `backend/consumer/src/domain/entities/consultorio-session.entity.ts` |
| HU-02 Vinculacion | Se bloquea doble consultorio para el mismo medico | Verificacion | Unit + Integracion | Tabla de decision (medico sin/si consultorio) | `backend/consumer/src/application/use-cases/assign-doctor-to-consultorio.use-case.ts` |
| HU-03 Paciente en atencion | Paciente visible solo en EnAtencion | Validacion | Component + E2E UI | Transicion de estados + equivalencia (con/sin atencion activa) | `frontend/src/app/medico/page.tsx`<br>`frontend/src/hooks/useConsultorioRealtime.ts` |
| HU-03 Paciente en atencion | Paciente no visible fuera de EnAtencion | Verificacion + Validacion | Component + Integracion | Particion por estado del consultorio | `frontend/src/app/medico/page.tsx` |
| HU-04 Disponibilidad | Cambio valido a no disponible sin atencion activa | Verificacion | Unit + Integracion | Transicion de estados (ConMedicoDisponible -> ConMedicoNoDisponible) | `backend/consumer/src/application/use-cases/set-doctor-availability.use-case.ts`<br>`backend/consumer/src/domain/entities/consultorio-session.entity.ts` |
| HU-04 Disponibilidad | No disponibilidad diferida durante EnAtencion | Verificacion + Validacion | Unit + Integracion + E2E | Maquina de estados + pruebas de secuencia | `backend/consumer/src/domain/entities/consultorio-session.entity.ts`<br>`backend/consumer/src/application/use-cases/finalize-medical-attention.use-case.ts` |
| HU-04 Disponibilidad | Reanudar disponible desde no disponible | Verificacion | Unit + Integracion | Transicion de estados (ConMedicoNoDisponible -> ConMedicoDisponible) | `backend/consumer/src/application/use-cases/set-doctor-availability.use-case.ts` |
| HU-05 Finalizacion/Liberacion | Finalizar atencion limpia paciente y deja estado correcto | Verificacion + Validacion | Unit + Integracion + E2E | Transicion de estados + analisis de secuencia | `backend/consumer/src/application/use-cases/finalize-medical-attention.use-case.ts`<br>`backend/consumer/src/domain/entities/consultorio-session.entity.ts` |
| HU-05 Finalizacion/Liberacion | Bloqueo de abandonar con atencion activa | Verificacion | Unit + Integracion | Caso negativo critico + estado invalido | `backend/consumer/src/domain/entities/consultorio-session.entity.ts`<br>`backend/consumer/src/application/use-cases/release-consultorio.use-case.ts` |
| HU-05 Finalizacion/Liberacion | Liberar consultorio sin atencion activa | Validacion | Integracion + E2E | Particion de equivalencia (con/sin atencion activa) | `backend/consumer/src/application/use-cases/release-consultorio.use-case.ts`<br>`backend/producer/src/application/use-cases/release-consultorio-command.use-case.ts` |

Nota:

- La columna de "Archivo(s) de evidencia real" se usa para auditar que cada criterio de la matriz está respaldado por implementación concreta en el sistema.

### 4.7 Tecnicas de diseno y valores limite prioritarios

| Elemento a probar | Particiones clave | Valores limite sugeridos | Nivel de prueba recomendado |
|---|---|---|---|
| Credenciales de acceso | Validas / invalidas / formato invalido / rol invalido | Vacio, solo espacios, longitud minima-maxima, email sin @ | Unit + Integracion + E2E |
| Identificadores (`doctorId`, `consultorioId`, `commandId`) | Presente valido / ausente / mal formado / duplicado | `""`, espacios, ids no existentes, `commandId` repetido | Unit + Integracion |
| Disponibilidad medica | Disponible / no disponible / cambio durante atencion | Secuencia de cambio rapida (toggle), idempotencia del mismo comando | Unit + Integracion + E2E |
| Estado de consultorio | SinMedico / ConMedicoDisponible / EnAtencion / ConMedicoNoDisponible | Frontera de transicion valida-invalida entre estados | Unit + Integracion |
| Cierre y liberacion | Atencion activa / sin atencion activa | Intento de liberar justo antes/despues de finalizar atencion | Integracion + E2E |

### 4.8 Evidencia SOLID por archivos de ejemplo

Esta seccion resume fortalezas SOLID observables y puntos no tan fuertes en archivos reales del sistema.

| Archivo | Principio que cumple mejor (SOLID en espanol) | Evidencia observada | Principio que no cumple por completo | Observacion |
|---|---|---|---|---|
| `backend/consumer/src/domain/entities/consultorio-session.entity.ts` | Responsabilidad Unica (SRP) | La entidad concentra reglas de estado del consultorio y no mezcla infraestructura. | Abierto/Cerrado (OCP) parcial | Si se agregan nuevos estados/transiciones, normalmente hay que modificar la misma clase. |
| `backend/producer/src/application/use-cases/get-consultorio-state.use-case.ts` | Inversion de Dependencias (DIP) | El caso de uso depende de `IConsultorioStateReader` (abstraccion) en lugar de un adapter concreto. | Abierto/Cerrado (OCP) parcial | Nuevas politicas de fallback/default implican editar este caso de uso. |
| `backend/consumer/src/domain/ports/IConsultorioSessionRepository.ts` | Segregacion de Interfaces (ISP) | Puerto pequeno y enfocado en operaciones de sesion (`findBy...`, `save`). | Sustitucion de Liskov (LSP) no evidenciable en este archivo | LSP se valida mejor en implementaciones/adaptadores, no solo en la interfaz. |
| `backend/consumer/src/turnos/turnos.module.ts` | Inversion de Dependencias (DIP) + Abierto/Cerrado (OCP) | Wiring por tokens y adapters intercambiables sin tocar dominio. | Responsabilidad Unica (SRP) parcial | El modulo concentra mucho wiring de infraestructura en un solo punto. |
| `backend/consumer/src/presentation/consumer.controller.ts` | Inversion de Dependencias (DIP) parcial | Delega flujo principal a casos de uso inyectados. | Responsabilidad Unica (SRP) y Abierto/Cerrado (OCP) parciales | `processMessage` mezcla responsabilidades y extender politicas suele requerir editar el controlador. |

Nota de lectura para sustentacion:

- La evaluacion es por archivo; un mismo archivo puede cumplir fuerte un principio y quedar parcial en otro.
- Esto no invalida la arquitectura general, pero si muestra oportunidades de mejora tecnica.

#### Snippet A - Fortaleza SRP en dominio

Archivo: `backend/consumer/src/domain/entities/consultorio-session.entity.ts`

```ts
marcarNoDisponible(): ConsultorioSession {
	if (this.estado === 'EnAtencion') {
		return this.copy({ noDisponibleDiferido: true });
	}

	return this.copy({
		estado: 'ConMedicoNoDisponible',
		noDisponibleDiferido: false,
	});
}
```

Lectura SOLID:

- SRP fuerte: la logica de negocio de disponibilidad vive en la entidad.
- La regla de intencion diferida se mantiene en dominio, no en controlador.

#### Snippet B - Fortaleza DIP en caso de uso

Archivo: `backend/producer/src/application/use-cases/get-consultorio-state.use-case.ts`

```ts
constructor(
	@Inject(CONSULTORIO_STATE_READER_TOKEN)
	private readonly consultorioStateReader: IConsultorioStateReader,
) {}
```

Lectura SOLID:

- DIP fuerte: el caso de uso depende de una interfaz/puerto.
- Facilita pruebas con dobles y reemplazo de adapters.

#### Snippet C - Punto menos fuerte de SRP/OCP en presentacion

Archivo: `backend/consumer/src/presentation/consumer.controller.ts`

```ts
private async processMessage(
	eventName: string,
	data: unknown,
	context: RmqContext,
	handler: (commandId: string) => Promise<void>,
): Promise<void> {
	// logging + clasificacion + retry + DLQ + ack/nack
}
```

Lectura SOLID:

- SRP no tan fuerte: hay varias responsabilidades en un unico metodo.
- OCP no tan fuerte: extender politicas de manejo de errores puede requerir editar este bloque central.

Recomendacion:

- Extraer estrategias de `ErrorClassifier`, `RetryPolicy` y `DlqPublisher` para mejorar cohesion y extensibilidad.

---

## 5) Matriz de riesgos y prioridad

| Riesgo | Impacto | Probabilidad | Cobertura principal |
|---|---|---|---|
| Acceso no autorizado al panel medico | Alto | Media | AuthGuard + tests de roles |
| Doble asignacion de consultorio | Alto | Media | Casos de uso + integration producer/consumer |
| Transiciones invalidas de estado | Alto | Alta | Unit tests de reglas + component tests medico |
| Inconsistencia realtime de estado | Alto | Media | Integration gateway/events + frontend realtime |
| Cierre de atencion fuera de secuencia | Alto | Media | Use cases + acceptance de flujo completo |

---

## 6) Evidencia de ejecucion en CI

Estado observado en pipeline:

- Lint & Typecheck: OK
- Component Tests (White-Box): OK
- Integration Tests (Black-Box): OK
- Docker Build & Security Scan: OK

---

## 7) Espacios para pantallazos de coverage

Instruccion:

- Guardar imagenes en docs/img.
- Mantener los nombres sugeridos para evitar romper enlaces.
- Reemplazar cada bloque cuando se tenga el pantallazo oficial.

### 7.1 Coverage Frontend (feature gestion consultorio)

Ruta esperada: docs/img/coverage_frontend_gestion_consultorio.png

Comando para generar coverage:

```bash
cd /home/duver-betancur/Training/IA_P1/frontend
npm run test:coverage
```

![Coverage Frontend - Gestion Consultorio](docs/img/coverage_frontend_gestion_consultorio.png)

### 7.2 Coverage Producer (feature gestion consultorio)

Ruta esperada: docs/img/coverage_producer_gestion_consultorio.png

Comando para generar coverage:

```bash
cd /home/duver-betancur/Training/IA_P1/backend/producer
npm run test:cov
```

![Coverage Producer - Gestion Consultorio](docs/img/coverage_producer_gestion_consultorio.png)

### 7.3 Coverage Consumer (feature gestion consultorio)

Ruta esperada: docs/img/coverage_consumer_gestion_consultorio.png

Comando para generar coverage:

```bash
cd /home/duver-betancur/Training/IA_P1/backend/consumer
npm run test:cov
```

![Coverage Consumer - Gestion Consultorio](docs/img/coverage_consumer_gestion_consultorio.png)

---

## 8) Criterios de salida

Para considerar el feature listo:

- Sin errores de lint y typecheck en CI.
- Suites de componentes e integracion en estado verde.
- Escenarios criticos de negocio sin fallos abiertos de severidad alta.
- Evidencias de coverage cargadas en docs/img y visibles desde este documento.

---

## 9) Trazabilidad documental

Documentos relacionados:

- TEST_PLAN_GESTION_CONSULTORIO.md
- AI_WORKFLOW.md
- TEST_PLAN.md

Version: 1.0
