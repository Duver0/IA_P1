# IA_P1 - Sistema de Turnos Médicos en Tiempo Real

Sistema para gestionar turnos médicos en tiempo real usando microservicios, mensajería asíncrona y WebSockets.

## Objetivo del proyecto

Permitir que un paciente registre su turno y reciba actualizaciones en tiempo real sobre su estado y asignación de consultorio.

## Alcance funcional (actual)

- Registrar turnos de pacientes por API.
- Procesar turnos de forma asíncrona con RabbitMQ.
- Asignar pacientes a consultorio por disponibilidad real (event-driven).
- Gestionar operación médica: asociar consultorio, disponibilidad, inicio/finalización de atención y liberación.
- Notificar cambios de estado en tiempo real al frontend.
- Consultar turnos por lista general o por cédula.
- Autenticación por roles para flujo interno (`admin`, `empleado`, `medico`).

## Arquitectura (resumen)

Flujo principal:

1. Frontend envía `POST /turnos` al Producer.
2. Producer publica evento en RabbitMQ y responde `202 Accepted`.
3. Consumer consume el evento y guarda el turno en MongoDB (estado `espera`).
4. Consumer intenta asignación inmediata por estado de consultorio y disponibilidad médica.
5. Consumer publica eventos de turno/consultorio en RabbitMQ.
6. Producer recibe eventos y los emite al frontend vía WebSocket.

Notas operativas:
- El scheduler actual del Consumer es de observabilidad (heartbeat), no ejecuta lógica de negocio.
- La asignación depende del estado de `ConsultorioSession` y de comandos médicos.

Servicios:

- **Producer** (`:3000`): API HTTP + WebSocket.
- **Consumer**: worker de procesamiento, transición de estados de consultorio y scheduler de observabilidad.
- **Frontend** (`:3001`): interfaz de registro y visualización.
- **RabbitMQ**: broker de mensajería.
- **MongoDB**: persistencia de turnos.

## Stack tecnológico

- NestJS (backend)
- Next.js (frontend)
- MongoDB
- RabbitMQ
- Docker + Docker Compose

## Requisitos

- Docker Engine
- Docker Compose

## Ejecución local

1. Clonar repositorio:

   ```bash
   git clone https://github.com/Duver0/IA_P1.git
   cd IA_P1
   ```

2. Configurar entorno:

   ```bash
   cp .env.example .env
   ```

3. Levantar servicios:

   ```bash
   docker compose up -d --build
   ```

4. Accesos:

- Frontend: http://localhost:3001
- API Docs: http://localhost:3000/api/docs
- RabbitMQ Admin: http://localhost:15672

## Variables de entorno clave

Configurar en `.env` (basado en `.env.example`):

- `PRODUCER_PORT`
- `FRONTEND_PORT`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_CONSULTORIOS_TOTAL`
- `RABBITMQ_PORT`
- `RABBITMQ_MGMT_PORT`
- `RABBITMQ_USER`
- `RABBITMQ_PASS`
- `RABBITMQ_QUEUE`
- `MONGODB_PORT`
- `MONGO_USER`
- `MONGO_PASS`

## API principal (Producer)

- `POST /turnos`: crear turno (respuesta asíncrona `202 Accepted`).
- `GET /turnos`: listar turnos.
- `GET /turnos/:cedula`: consultar turnos por cédula.
- `POST /auth/signUp`: registrar usuario interno.
- `POST /auth/signIn`: iniciar sesión.
- `POST /auth/signOut`: cerrar sesión.
- `GET /auth/me`: usuario autenticado actual.
- `GET /auth/dashboard-history`: historial de turnos (rutas internas protegidas).
- `POST /medicos/consultorio/asignar`: asociar consultorio.
- `PATCH /medicos/disponibilidad`: cambiar disponibilidad médica.
- `POST /medicos/atencion/iniciar`: iniciar atención.
- `POST /medicos/atencion/finalizar`: finalizar atención.
- `POST /medicos/consultorio/liberar`: liberar consultorio.
- `GET /medicos/consultorio/estado/:consultorioId`: estado actual del consultorio.

Ejemplo:

```bash
curl -X POST http://localhost:3000/turnos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Paciente Test","cedula":12345,"priority":"alta"}'
```

## Testing

Backend (producer):

```bash
cd backend/producer
npm test
npm run test:cov
```

Backend (consumer):

```bash
cd backend/consumer
npm test
npm run test:cov
```

Frontend:

```bash
cd frontend
npm test
npm run test:coverage
```

## Estado del proyecto

Sistema funcional en desarrollo continuo, con enfoque en robustecer arquitectura hexagonal y calidad para producción.
