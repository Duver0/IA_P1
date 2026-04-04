# Plan de commits atomicos

## Base de analisis
- Comando ejecutado: git status --short
- Comando ejecutado: git diff --stat
- Resultado actual: 25 archivos modificados
- Volumen estimado: 1781 inserciones, 581 eliminaciones

## Notas de alcance
- No se detectaron cambios de limpieza de automatizacion (cucumber/e2e) en el working tree, por lo cual no se propone commit chore de limpieza.
- No hay cambios productivos en casos de uso backend (application), solo pruebas.
- Para cumplir la regla de no mezclar logica funcional con cambios visuales, se propone staging parcial por hunks en estos archivos mixtos:
  - frontend/src/app/page.tsx
  - frontend/src/app/dashboard/page.tsx
  - frontend/src/app/medico/page.tsx

## Commit 1
- Tipo: feat
- Scope: domain
- Mensaje corto: feat(domain): extender contrato de turno con datos de medico
- Archivos:
  - backend/producer/src/domain/entities/turno.entity.ts
  - backend/producer/src/domain/ports/ITurnoRepository.ts
  - frontend/src/domain/Ticket.ts
- Justificacion:
  - Todos estos cambios amplian el contrato de dominio del turno para soportar medico asignado y metadatos de cierre.
  - Mantenerlos juntos asegura versionado consistente del modelo entre backend y frontend.

## Commit 2
- Tipo: feat
- Scope: infra
- Mensaje corto: feat(infra): enriquecer turno realtime con medico por consultorio
- Archivos:
  - backend/producer/src/infrastructure/adapters/turno-mongoose.adapter.ts
  - backend/producer/src/events/turnos.gateway.ts
  - backend/producer/src/turnos/turnos.module.ts
- Justificacion:
  - Este grupo implementa la resolucion del medico en infraestructura, su inyeccion de dependencias y el broadcast enriquecido en realtime.
  - Son cambios de una misma cadena tecnica: persistencia -> wiring DI -> emision websocket.

## Commit 3
- Tipo: test
- Scope: producer
- Mensaje corto: test(producer): cubrir enriquecimiento de medico en adapter y gateway
- Archivos:
  - backend/producer/test/application/get-all-turnos.use-case.spec.ts
  - backend/producer/test/application/get-turnos-by-cedula.use-case.spec.ts
  - backend/producer/test/domain/turno.entity.spec.ts
  - backend/producer/test/infrastructure/turno-mongoose.adapter.spec.ts
  - backend/producer/test/presentation/turnos.gateway.spec.ts
- Justificacion:
  - Son pruebas de regresion de backend ligadas al nuevo contrato de turno y a su enriquecimiento realtime.
  - Deben ir separadas de implementacion para permitir rollback selectivo de tests sin tocar codigo productivo.

## Commit 4
- Tipo: feat
- Scope: ui
- Mensaje corto: feat(ui): consolidar logica de llamados, historial y panel medico
- Archivos:
  - frontend/src/infrastructure/mappers/ticketMapper.ts
  - frontend/src/components/Navbar/Navbar.tsx
  - frontend/src/app/page.tsx (solo hunks logicos)
  - frontend/src/app/dashboard/page.tsx (solo hunks logicos)
  - frontend/src/app/medico/page.tsx (solo hunks logicos)
- Justificacion:
  - Incluye logica funcional de frontend: notificacion por llamados reales, mapeo de medico/fin de atencion, reglas de consultorio medico y pausa programada.
  - El objetivo es aislar comportamiento de negocio de cualquier cambio puramente visual.

## Commit 5
- Tipo: style
- Scope: ui
- Mensaje corto: style(ui): redisenar vistas de turnos, historial y panel medico
- Archivos:
  - frontend/src/styles/page.module.css
  - frontend/src/styles/medico.module.css
  - frontend/src/app/page.tsx (solo hunks visuales)
  - frontend/src/app/dashboard/page.tsx (solo hunks visuales)
  - frontend/src/app/medico/page.tsx (solo hunks visuales)
- Justificacion:
  - Reune exclusivamente estructura y presentacion visual: layout, tipografia, estados y ayudas visuales.
  - Mantenerlo separado de logica facilita revisar UX sin riesgo de introducir regresiones funcionales.

## Commit 6
- Tipo: test
- Scope: ui
- Mensaje corto: test(ui): actualizar pruebas de llamados, historial y panel medico
- Archivos:
  - frontend/src/__tests__/app/page.spec.tsx
  - frontend/src/__tests__/app/dashboard/page.spec.tsx
  - frontend/src/__tests__/app/medico/page.spec.tsx
  - frontend/src/__tests__/components/Navbar/Navbar.spec.tsx
  - frontend/src/__tests__/infrastructure/mappers/ticketMapper.spec.ts
- Justificacion:
  - Son pruebas unitarias y de componente alineadas con los cambios funcionales y de UX del frontend.
  - Agruparlas permite validar cobertura y no regresion de forma independiente al codigo productivo.

## Commit 7
- Tipo: docs
- Scope: qa
- Mensaje corto: docs(qa): actualizar changelog y plan de pruebas consultorio
- Archivos:
  - CHANGELOG.md
  - TEST_PLAN_GESTION_CONSULTORIO.md
- Justificacion:
  - Son documentos de continuidad (release notes + plan formal de pruebas).
  - Deben ir al final para reflejar estado final ya consolidado tras codigo y pruebas.

## Verificacion de cobertura
- Todos los archivos listados en git status quedaron asignados al menos una vez.
- Los tres archivos TSX mixtos se asignan en dos commits mediante staging parcial por hunks para mantener separacion logica/visual.