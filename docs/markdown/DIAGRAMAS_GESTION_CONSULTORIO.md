# Diagramas de la Feature: Gestion de Consultorio y Sesion Medica

Documento de soporte visual para sustentacion tecnica y funcional.

Fecha: 2026-04-08

---

## 1) Diagrama de estado completo (consultorio + cola + turno)

```mermaid
stateDiagram-v2
    [*] --> SinMedico

    SinMedico --> ConMedicoDisponible: asociar_medico_consultorio
    ConMedicoDisponible --> ConMedicoNoDisponible: cambiar_disponibilidad(false)
    ConMedicoNoDisponible --> ConMedicoDisponible: cambiar_disponibilidad(true)

    ConMedicoDisponible --> EnAtencion: turno llamado + iniciar_atencion_medica

    EnAtencion --> EnAtencion: cambiar_disponibilidad(false) / noDisponibleDiferido=true
    EnAtencion --> EnAtencion: cambiar_disponibilidad(true) / noDisponibleDiferido=false

    EnAtencion --> ConMedicoDisponible: finalizar_atencion_medica / turno=atendido / noDisponibleDiferido=false
    EnAtencion --> ConMedicoNoDisponible: finalizar_atencion_medica / turno=atendido / noDisponibleDiferido=true

    ConMedicoDisponible --> SinMedico: liberar_consultorio
    ConMedicoNoDisponible --> SinMedico: liberar_consultorio

    note right of ConMedicoDisponible
      Cola de pacientes habilitada:
      - turnos en espera pueden pasar a llamado
      - se permite iniciar atencion
    end note

    note right of ConMedicoNoDisponible
      Cola de pacientes bloqueada:
      - no se llaman nuevos pacientes
      - turnos se mantienen en espera
    end note
```

---

## 2) Diagrama arquitectonico de la feature en el sistema

```mermaid
flowchart LR
    subgraph UI[Frontend Next.js]
        MP[Pagina Medico]
        RTH[Hook useConsultorioRealtime]
        GUARD[AuthGuard]
    end

    subgraph PROD[Producer NestJS]
        REST[REST Controllers medicos y consultorios]
        UCMD[Use Cases de comandos]
        PPORT[Puertos de salida producer]
        P_ADAPT[RabbitMQ Publisher Adapter]
        STATE_R[Consultorio State Reader Adapter]
        GATE[TurnosGateway WebSocket]
    end

    subgraph MQ[RabbitMQ]
        Q1[(turnos_queue)]
        Q2[(eventos de dominio)]
    end

    subgraph CONS[Consumer NestJS]
        EVH[ConsumerController EventPattern]
        CORE[Dominio ConsultorioSession + Use Cases]
        CPORT[Puertos de salida consumer]
        C_ADAPT[Mongoose Adapters + Event Publisher]
    end

    subgraph DB[(MongoDB)]
        COLL1[(consultoriosessions)]
        COLL2[(turnos)]
        COLL3[(doctors)]
        COLL4[(processedmedicalcommands)]
    end

    MP --> GUARD
    MP --> REST
    RTH --> GATE

    REST --> UCMD
    UCMD --> PPORT
    PPORT --> P_ADAPT
    PPORT --> STATE_R

    P_ADAPT --> Q1
    Q1 --> EVH
    EVH --> CORE
    CORE --> CPORT
    CPORT --> C_ADAPT

    C_ADAPT --> COLL1
    C_ADAPT --> COLL2
    C_ADAPT --> COLL3
    C_ADAPT --> COLL4
    C_ADAPT --> Q2

    Q2 --> GATE
    GATE --> RTH
```

---

## 3) Diagrama de secuencia: no disponible durante atencion activa (intencion diferida)

```mermaid
sequenceDiagram
    actor Medico
    participant FE as Frontend Medico
    participant P as Producer API
    participant MQ as RabbitMQ
    participant C as Consumer
    participant D as ConsultorioSession (Dominio)
    participant DB as MongoDB
    participant WS as Producer Gateway

    Medico->>FE: Solicita no disponible durante atencion activa
    FE->>P: PATCH /medicos/disponibilidad (disponible=false)
    P->>MQ: Publica cambiar_disponibilidad_medico(commandId)
    MQ->>C: Entrega evento de comando
    C->>D: marcarNoDisponible()
    D-->>C: estado=EnAtencion, noDisponibleDiferido=true
    C->>DB: Persiste sesion + snapshot idempotente
    C->>MQ: Publica consultorio_updated
    MQ->>WS: Evento consultorio_updated
    WS-->>FE: Estado sigue EnAtencion (pausa programada)

    Medico->>FE: Finaliza atencion actual
    FE->>P: POST /medicos/atencion/finalizar
    P->>MQ: Publica finalizar_atencion_medica(commandId)
    MQ->>C: Entrega evento de comando
    C->>D: finalizarAtencion()
    D-->>C: estado=ConMedicoNoDisponible
    C->>DB: Marca turno=atendido y persiste estado final
    C->>MQ: Publica attention_finished + consultorio_updated
    MQ->>WS: Reenvio realtime
    WS-->>FE: Consultorio queda no disponible, sin paciente activo
```

---

## 4) Nota de uso en sustentacion

Orden recomendado para explicar:

1. Estado completo para reglas de negocio.
2. Arquitectura para hexagonal y fronteras de puertos/adaptadores.
3. Secuencia para justificar intencion diferida y consistencia eventual.

