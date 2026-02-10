# AI Workflow - Estrategia de Interacción con IA

## Metodología AI-First

Este proyecto utiliza una metodología **AI-First** donde la IA actúa como un "Junior Developer" generando código inicial que luego es revisado y refinado por el equipo.

## Herramientas Utilizadas

- **GitHub Copilot**: Generación de código y autocompletado inteligente.
- **Cursor**: Revisión y refactorización de código asistida por IA.

## Proceso de Interacción

1. **Generación inicial**: La IA genera la estructura base del proyecto, incluyendo configuraciones de Docker, microservicios y componentes frontend.
2. **Revisión humana**: El equipo revisa el código generado, prestando especial atención a las áreas marcadas con `// ⚕️ HUMAN CHECK`.
3. **Refinamiento**: Se ajusta el código según las mejores prácticas y requisitos específicos del proyecto.
4. **Validación**: Se ejecutan pruebas y se verifica el correcto funcionamiento del sistema.

## Comentarios Centinela

Se utilizan comentarios `// ⚕️ HUMAN CHECK` en las siguientes áreas críticas:

- Configuración de Docker Compose (puertos, redes, volúmenes)
- Dockerfiles (versiones de imágenes base)
- Variables de entorno (credenciales y configuración sensible)
- Configuración de RabbitMQ (colas, exchanges, credenciales)
- Endpoints de la API (validación y seguridad)

## Lo que la IA hizo mal

- La IA tiende a generar configuraciones con credenciales por defecto (e.g., `guest/guest` en RabbitMQ) que deben cambiarse en producción.
- En algunos casos, la IA no incluye validaciones de entrada adecuadas en los endpoints.
- Las configuraciones de Docker generadas inicialmente no siempre optimizan el uso de capas de caché.
- La IA puede generar dependencias con versiones desactualizadas o incompatibles entre sí.

## Dinámicas de Interacción

- **Boilerplate**: La IA genera toda la estructura inicial del proyecto sin escritura manual de código.
- **Revisión por pares**: Cada PR es revisado por al menos un miembro del equipo antes de fusionarse.
- **Iteración continua**: El equipo itera sobre el código generado, mejorando la calidad progresivamente.
