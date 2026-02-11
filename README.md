# IA_P1 - Sistema de Turnos Médicos

Sistema que asigna turnos médicos automáticamente usando microservicios.

## ¿Cómo funciona?

```
Paciente envía turno → Producer → RabbitMQ → Consumer → MongoDB
                        (API)      (cola)     (worker)    (base de datos)
```

1. El **Producer** recibe la solicitud por HTTP y la envía a una cola
2. El **Consumer** toma el mensaje de la cola, asigna un consultorio y lo guarda en MongoDB
3. Todo pasa de forma asíncrona — el paciente recibe confirmación inmediata

## Servicios

| Servicio | Contenedor | Puerto | Función |
|---|---|---|---|
| Producer | `backend-producer` | 3000 | API que recibe turnos |
| Consumer | `backend-consumer` | — | Worker que procesa y guarda |
| RabbitMQ | `P1_rabbitmq` | 5672 / 15672 | Cola de mensajes |
| MongoDB | `P1_mongodb` | 27017 | Base de datos |
| Frontend | — | 3001 | Interfaz web |

## Inicio Rápido

```bash
# Clonar y configurar
git clone https://github.com/Duver0/IA_P1.git
cd IA_P1
cp .env.example .env

# Levantar todo
docker compose up --build -d

# Probar enviando un turno
curl -X POST http://localhost:3000/turnos \
  -H "Content-Type: application/json" \
  -d '{"pacienteId": "PAC-001", "nombre": "Juan Pérez"}'
```

**Respuesta esperada** (HTTP 202):
```json
{"status": "accepted", "message": "Turno en proceso de asignación"}
```

## Ver los turnos guardados

```bash
docker exec P1_mongodb mongosh \
  "mongodb://admin:admin123@localhost:27017/turnos_db?authSource=admin" \
  --eval "db.turnos.find().pretty()" --quiet
```

## Comandos útiles

```bash
docker compose ps              # Ver estado de contenedores
docker compose logs -f consumer # Ver logs del consumer
docker compose down             # Detener todo
docker compose down -v          # Detener y borrar datos
docker compose up --build -d    # Reconstruir y levantar
```

## Estructura

```
IA_P1/
├── backend/
│   ├── producer/        ← API (NestJS) - recibe turnos
│   │   └── src/
│   │       ├── producer.controller.ts   (POST /turnos)
│   │       ├── producer.service.ts      (publica en RabbitMQ)
│   │       └── dto/create-turno.dto.ts  (validación)
│   └── consumer/        ← Worker (NestJS) - procesa turnos
│       └── src/
│           ├── consumer.controller.ts   (escucha RabbitMQ)
│           ├── schemas/turno.schema.ts  (modelo MongoDB)
│           └── turnos/turnos.service.ts (guarda en DB)
├── frontend/            ← Interfaz (Next.js)
├── docker-compose.yml
└── .env.example
```

## Variables de entorno

| Variable | Default | Qué es |
|---|---|---|
| `PRODUCER_PORT` | 3000 | Puerto de la API |
| `RABBITMQ_USER` | guest | Usuario RabbitMQ |
| `RABBITMQ_PASS` | guest | Contraseña RabbitMQ |
| `RABBITMQ_QUEUE` | turnos_queue | Nombre de la cola |
| `MONGO_USER` | admin | Usuario MongoDB |
| `MONGO_PASS` | admin123 | Contraseña MongoDB |

> ⚠️ **Las credenciales por defecto son solo para desarrollo.** Cambiarlas antes de producción.

## Tecnologías

- **NestJS 10** — Producer y Consumer
- **RabbitMQ 3** — Mensajería asíncrona
- **MongoDB 7** — Persistencia con Mongoose
- **Next.js** — Frontend
- **Docker Compose** — Orquestación

## Lo que la IA hizo mal

Durante el desarrollo asistido por IA, se identificaron los siguientes puntos que requirieron intervención manual o corrección:

1.  **Credenciales Inseguras**: La IA generó archivos de configuración con credenciales por defecto (`guest/guest`, `admin/admin123`) sin advertencias suficientes sobre el riesgo en producción. Se agregaron comentarios `⚕️ HUMAN CHECK`.
2.  **Manejo de Errores en RabbitMQ**: La configuración inicial no manejaba correctamente las reconexiones. Si RabbitMQ no estaba listo, el servicio fallaba inmediatamente.
3.  **Validaciones Laxas**: Los DTOs iniciales usaban tipos `any` o carecían de validaciones estrictas (`class-validator`), lo que permitía inyección de datos basura.
4.  **Optimización de Docker**: Los Dockerfiles generados no aprovechaban el caché de capas (copiaban todo el código antes de `npm install`), lo que hacía los builds muy lentos.
5.  **Simulaciones vs Realidad**: La IA sugirió lógica simulada (ej. `Math.random` para consultorios) que funcionalmente sirve para un MVP pero no refleja una lógica de negocio real.

## Estrategia AI-First

Ver [AI_WORKFLOW.md](./AI_WORKFLOW.md) para detalles sobre la metodología de desarrollo con IA.