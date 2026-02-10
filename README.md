# IA_P1 - Sistema de Gestión de Turnos Médicos

## Visión General

Sistema de microservicios para gestionar turnos médicos utilizando **RabbitMQ** para la comunicación asíncrona entre servicios. La arquitectura se compone de:

- **Frontend (Next.js)**: Interfaz para que los pacientes consulten y soliciten turnos médicos.
- **Backend / Producer (NestJS)**: API RESTful que recibe solicitudes de turnos y las publica en RabbitMQ.
- **Consumer / Worker (NestJS)**: Procesa los turnos desde la cola de RabbitMQ, asigna turnos y envía notificaciones.
- **RabbitMQ**: Broker de mensajería para comunicación asíncrona entre Producer y Consumer.

## Estructura del Proyecto

```
IA_P1/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── docker-compose.yml
├── .env
├── AI_WORKFLOW.md
└── README.md
```

## Requisitos Previos

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

## Configuración

1. Clonar el repositorio:

```bash
git clone https://github.com/Duver0/IA_P1.git
cd IA_P1
```

2. Configurar las variables de entorno editando el archivo `.env` en la raíz del proyecto con los valores deseados (los valores por defecto funcionan para desarrollo local).

3. Levantar los contenedores:

```bash
docker-compose up
```

4. Acceder a los servicios:

| Servicio             | URL                          |
| -------------------- | ---------------------------- |
| Frontend (Next.js)   | http://localhost:3001         |
| Backend (NestJS API) | http://localhost:3000         |
| RabbitMQ Management  | http://localhost:15672        |

## Comandos Útiles

```bash
# Levantar todos los contenedores en segundo plano
docker-compose up -d

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Detener los contenedores
docker-compose down

# Reconstruir las imágenes
docker-compose up --build
```

## Desarrollo

Los volúmenes configurados en `docker-compose.yml` permiten desarrollo en vivo: los cambios en el código fuente se reflejan automáticamente sin necesidad de reconstruir las imágenes.

- El directorio `backend/` se monta en `/app` del contenedor backend.
- El directorio `frontend/` se monta en `/app` del contenedor frontend.
- `node_modules` se maneja como volumen anónimo para evitar conflictos entre el host y el contenedor.

## Lo que la IA hizo mal

- Generó credenciales por defecto (`guest/guest`) para RabbitMQ que **no deben usarse en producción**.
- No incluyó validaciones de entrada en los endpoints de la API inicialmente.
- Las configuraciones iniciales de Docker no optimizaban las capas de caché (se copiaba todo el código antes de instalar dependencias).
- Algunas versiones de dependencias generadas podían ser incompatibles entre sí.
- No se incluyó manejo de errores adecuado en la conexión a RabbitMQ.

## Estrategia AI-First

Consulta el archivo [AI_WORKFLOW.md](./AI_WORKFLOW.md) para más detalles sobre la metodología de interacción con IA utilizada en este proyecto.