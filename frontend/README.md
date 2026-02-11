# Frontend — Sistema de Gestión de Turnos

Frontend desarrollado con **Next.js (App Router)** para la visualización en tiempo real y registro de turnos.  
Este proyecto implementa una arquitectura limpia, resiliente y preparada para escalar hacia tiempo real (SSE / WebSocket).

## Objetivo

Proveer una interfaz ligera, segura y resiliente para:

- Visualizar turnos en pantalla en tiempo real (polling optimizado)
- Registrar nuevos turnos desde formulario
- Garantizar estabilidad ante fallos del backend
- Mantener arquitectura desacoplada y mantenible

## Stack Tecnológico

| Tecnología | Uso |
|----------|-----|
| Next.js 16 | Framework principal |
| React 19 | UI |
| TypeScript | Tipado estático |
| App Router | Arquitectura moderna |
| CSS Modules | Estilos encapsulados |
| Fetch API | Cliente HTTP |
| ESLint | Calidad de código |

## Características Técnicas

### Arquitectura

- Clean Architecture (capas desacopladas)
- Repository Pattern
- Separación dominio / infraestructura / UI
- Servicios desacoplados (AudioService)
- Hooks especializados

### Resiliencia

- Cliente HTTP centralizado
- Retry automático
- Timeout configurable
- Circuit Breaker
- Manejo de errores tipificado
- Protección contra doble submit
- Prevención de memory leaks

### Seguridad

- Sanitización de input
- Rate limit en middleware
- Security headers
- CSP compatible con Next.js
- Bloqueo de métodos no permitidos

### Tiempo real (Polling optimizado)

- Evita re-render innecesario
- Evita loops duplicados
- Evita fugas de memoria
- Preparado para migrar a SSE / WebSocket

### Audio desacoplado

- Servicio independiente
- No bloquea render
- Activación por interacción del usuario

## Estructura del Proyecto

El proyecto sigue una arquitectura desacoplada y organizada por responsabilidades:

```bash

- app/**          → Rutas y páginas del App Router
- components/**   → Componentes UI reutilizables
- domain/**       → Modelos y contratos del negocio
- repositories/** → Acceso a datos mediante Repository Pattern
- hooks/**        → Lógica de negocio encapsulada en hooks
- lib/**          → Infraestructura compartida
- services/**     → Servicios desacoplados
- config/**       → Variables y configuración de entorno
- security/**     → Sanitización y protecciones básicas
- styles/**       → Estilos globales
- proxi.ts**      → Middleware

```

Arquitectura preparada para escalar hacia tiempo real, backend productivo y mayor seguridad sin refactor mayor.

## Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/mock
NEXT_PUBLIC_POLLING_INTERVAL=3000
````

## Instalación

```bash
npm install
```

## Ejecución en Desarrollo

```bash
npm run dev
```

Aplicación disponible en:

```
http://localhost:3000
```

## Build Producción

```bash
npm run build
npm start
```

## API Mock Incluida

El proyecto incluye un endpoint mock:

```
GET  /api/mock/turnos
POST /api/mock/turnos
```

Esto permite ejecutar el frontend sin backend real.

## Decisiones Técnicas

* No se utiliza estado global (no necesario para el dominio actual)
* Polling en lugar de WebSocket para simplicidad del MVP, escalable a SSE / WebSocket
* CSS Modules para evitar colisiones de estilos
* Cliente HTTP centralizado para resiliencia
* Arquitectura preparada para escalar sin refactor complejo

## Preparado para Escalar

El proyecto está diseñado para evolucionar hacia:

* WebSocket / SSE
* Backend real con colas (RabbitMQ)
* Observabilidad (si se requiere)
* Testing automatizado
* Despliegue en contenedores
* Multi-pantalla en tiempo real

## Calidad de Código

* Sin memory leaks
* Sin loops duplicados
* Sin re-render innecesario
* Manejo de errores controlado
* Sanitización de inputs
* Código documentado
* Separación de responsabilidades

## Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm start        # Ejecutar build
npm run lint     # Lint
```

## Requisitos

* Node.js 20+
* NPM 9+

## Estado del Proyecto

**MVP funcional — estable — preparado para evolución.**
