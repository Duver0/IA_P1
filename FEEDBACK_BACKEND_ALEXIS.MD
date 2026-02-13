# FEEDBACK_BACKEND_ALEXIS - Taller IA (Backend)

## 1) Evaluacion con puntuacion (1-5) por criterio

### Estrategia de IA: 3/5
La documentacion `AI_WORKFLOW.md` define un flujo AI-First y roles basicos (IA genera, humanos revisan), pero no hay prompts reales, ni criterios de aceptacion, ni trazabilidad de iteraciones. Hay intencion, pero falta evidencia operativa.

### Calidad del Codigo & HUMAN CHECK: 3/5
Existen comentarios `// ⚕️ HUMAN CHECK` y tipado mejorado, pero el pipeline de consumo de mensajes tenia validacion incompleta y manejo de ack/nack no definido, lo que podia bloquear la cola. Se corrigieron puntos clave, pero aun faltan indices e idempotencia.

### Transparencia: 3/5
Se declara AI-First, herramientas usadas y puntos donde la IA falla. Sin embargo, no se muestra evidencia concreta de revisiones o cambios derivados de esas observaciones. Transparencia parcial.

### Arquitectura & Docker: 2/5
La arquitectura de microservicios y eventos esta clara, pero `docker-compose.yml` es de desarrollo: sin healthchecks, sin restart policies, credenciales por defecto y puertos sensibles expuestos. Es funcional pero fragil.

### Git Flow & Colaboracion: 2/5
No hay evidencia en el repositorio de un flujo Git claro (ramas, PRs, convenciones, CI). Se asume colaboracion, pero no se ve reflejada en artefactos.

## 2) Hallazgos Criticos

- Falta de idempotencia en la creacion de turnos (riesgo de duplicados en reentregas de mensajes).
- Falta de indices en MongoDB (riesgo de rendimiento y consistencia en asignacion).
- Manejo inicial incorrecto de ack/nack en Consumer (riesgo de bloqueo por `prefetch=1`).
- Scheduler inconsistente con la documentacion (intervalo 1s y comentario 5s vs README 15s).
- Credenciales y despliegue fragil en `docker-compose.yml` (defaults, puertos expuestos, sin healthchecks).

## 3) Mejoras Implementadas por el Equipo Auditor

### Scheduler configurable
Se reemplazo el intervalo fijo por `SCHEDULER_INTERVAL_MS` via `ConfigService` con default 15000 ms (alineado a README). Impacto: coherencia documental y control operativo sin recompilar.

### ValidationPipe en eventos
Se aplico `ValidationPipe` global al microservicio RMQ (`whitelist`, `forbidNonWhitelisted`, `transform`). Impacto: los eventos se validan consistentemente con `CreateTurnoDto`, reduciendo datos corruptos.

### Manejo explicito de ack/nack
Se confirmo `ack` solo en exito y se agrego `nack` controlado: sin requeue para errores de validacion y con requeue para errores transitorios. Impacto: evita bloqueo por `prefetch=1` y reduce loops de mensajes invalidos.

## 4) Optimizacion AI-First – Detector de Alucinaciones (Bonus)

Se utilizo IA para escanear el servicio Consumer en busca de patrones funcionales pero fragiles. El pipeline de consumo de mensajes se identifico como candidato prioritario para optimizacion, en linea con el Principio 01 de priorizacion de IA.

Se detecto un bloque funcional pero suboptimo en el pipeline de consumo de mensajes, especificamente en la validacion de eventos RMQ y el manejo de confirmaciones.

### Evidencia Tecnica (Antes vs Despues)

Antes (version base en `HEAD`, sin `ValidationPipe` global ni `nack` explicito):

```ts
// backend/consumer/src/main.ts (HEAD)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
        urls: [rabbitUrl],
        queue: queueName,
        noAck: false,
        queueOptions: { durable: true },
        prefetchCount: 1,
    },
});

await app.listen();
```

```ts
// backend/consumer/src/consumer.controller.ts (HEAD)
try {
    // ...
    channel.ack(originalMsg);
} catch (error: unknown) {
    // ...
    // channel.nack(originalMsg, false, false); // DLQ si configurado
}
```

Despues (version actual, con validacion y manejo de ack/nack diferenciado):

```ts
// backend/consumer/src/main.ts
app.useGlobalPipes(
    new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }),
);
```

```ts
// backend/consumer/src/consumer.controller.ts
channel.ack(originalMsg);
// ...
if (error instanceof BadRequestException) {
    channel.nack(originalMsg, false, false);
} else {
    channel.nack(originalMsg, false, true);
}
```

Que hacia el codigo original:
- Consumía eventos RMQ sin validacion global del payload y sin estrategia de `nack` activa.

Riesgo arquitectonico:
- Mensajes invalidos o transitorios podian bloquear la cola con `prefetch=1` o generar inconsistencias.

Por que es un patron comun en codigo generado por IA:
- La IA suele priorizar el camino feliz (procesar + ack) y omitir semantica de confirmaciones y validacion de eventos en microservicios.

Mejora concreta:
- Se valida el payload en entrada y se separa el tratamiento de errores de validacion vs transitorios, evitando loops e interrupciones del consumo.

### Impacto Tecnico Medible

- Confiabilidad: menor probabilidad de bloqueo por eventos invalidos.
- Control de errores: estrategia explicita de `ack`/`nack` con requeue controlado.
- Evitacion de bloqueo de cola: se evita que un mensaje erroneo detenga el consumo con `prefetch=1`.
- Alineacion con arquitectura event-driven: validacion y confirmaciones coherentes con el flujo asincrono.
