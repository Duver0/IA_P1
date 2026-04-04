# AI_WORKFLOW.md — Guía simple para IA

Este archivo define cómo debe trabajar la IA en este proyecto.
Si hay conflicto entre estilos, priorizar: **arquitectura + seguridad + no romper flujo actual**.

---

## 1) Resumen del sistema (actual)

Proyecto: sistema de turnos médicos en tiempo real.

Flujo principal:
1. Frontend envía `POST /turnos` al Producer.
2. Producer publica evento en RabbitMQ y responde `202 Accepted`.
3. Consumer guarda el turno en MongoDB (`espera`).
4. Consumer intenta asignación inmediata por estado de consultorio y disponibilidad médica.
5. Consumer publica eventos de actualización de turno y consultorio.
6. Producer consume eventos y emite actualización por WebSocket al frontend.

Nota:
- El scheduler del Consumer es de observabilidad (heartbeat), no ejecuta asignación de negocio.

---

## 2) Stack permitido

- Backend: NestJS
- Frontend: Next.js
- DB: MongoDB + Mongoose
- Broker: RabbitMQ
- Real-time: socket.io
- Infra: Docker Compose
- Estilos frontend: CSS Modules

---

## 3) Restricciones (NO hacer)

- No reemplazar NestJS, MongoDB/Mongoose ni RabbitMQ.
- No agregar frameworks CSS externos.
- No hardcodear secretos, credenciales o URLs sensibles.
- No acoplar casos de uso a infraestructura concreta.

---

## 4) Arquitectura obligatoria

Patrón: **Hexagonal + SOLID**

Capas:
- Domain: entidades + puertos
- Application: casos de uso
- Infrastructure: adaptadores
- Presentation: controladores HTTP / gateways WS

Dependencias válidas:
- `Presentation -> Application -> Domain`
- `Infrastructure -> Domain`

Regla crítica:
- Usar puertos/interfaces + tokens de inyección.
- No inyectar `@InjectModel` o `ClientProxy` directo en use cases.

---

## 5) Reglas de generación (DO)

La IA debe:
1. Entregar código completo (sin TODO vacíos).
2. Mantener responsabilidades únicas por clase/método.
3. Usar `ConfigService` + `.env` para configuración.
4. Implementar cleanup (`OnModuleDestroy`) cuando aplique.
5. Manejar `ack/nack` explícito en consumidores RabbitMQ.
6. Mantener tipos explícitos (evitar `any`).
7. Actualizar módulos/providers cuando agregue dependencias.
8. No romper comportamiento existente.

---

## 6) Alcance funcional vigente

- Registro de turnos.
- Procesamiento asíncrono.
- Asignación de paciente a consultorio por disponibilidad real.
- Notificación en tiempo real.
- Consulta por listado y por cédula.
- Autenticación y autorización por roles (`admin`, `empleado`, `medico`).
- Operación médica: asociar consultorio, gestionar disponibilidad, iniciar/finalizar atención y liberar consultorio.

---

## 7) Checklist antes de entregar cambios

- Compila sin errores.
- Respeta arquitectura hexagonal.
- No expone secretos.
- Ajusta pruebas si el cambio lo requiere.
- Mantiene flujo de turnos funcionando.
- Documenta archivos tocados y cambios de DI.

---

## 8) Formato de prompt recomendado para IA

Usar esta plantilla:

```txt
Contexto: AI_WORKFLOW.md adjunto

Objetivo: [qué construir/corregir]
Servicio: [Producer | Consumer | Frontend]
Capa: [Domain | Application | Infrastructure | Presentation]

Reglas:
- Hexagonal + SOLID
- Sin hardcodear secretos
- No romper flujo actual

Salida esperada:
- Código completo
- Archivos modificados
- Cambios en módulos/providers
- Validación (test/build)
```

---

## 9) Anti-patrones prohibidos

- Controladores con lógica de negocio.
- Use cases con acceso directo a DB o broker.
- Adaptadores con métodos `Not implemented` en producción.
- Credenciales dentro del código.
- Cambios grandes fuera del alcance pedido.

---

## 10) Referencias rápidas

- `README.md`: visión general y ejecución.
- `backend/producer`: API y WebSocket.
- `backend/consumer`: worker, scheduler, persistencia.
- `frontend`: experiencia de usuario.
- `docker-compose.yml`: entorno local.

---

Versión: 2.1 (IA-friendly)
Última actualización: Febrero 2026