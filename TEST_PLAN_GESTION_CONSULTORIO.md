# TEST_PLAN_GESTION_CONSULTORIO.md

## 1. Introduccion
Este plan valida que la atencion medica en consultorio funcione de forma segura, ordenada y predecible para el personal de salud y para el paciente.

Es importante para el negocio porque protege la continuidad de la atencion, evita asignaciones incorrectas y reduce riesgos de operacion en momentos de alta demanda.

## 2. Alcance

### Cubre
- Autenticacion de personal medico.
- Asociacion de medico a consultorio.
- Visualizacion de paciente en atencion.
- Gestion de disponibilidad del medico.
- Finalizacion y cierre correcto de la atencion.
- Validacion de cambios de estado permitidos y bloqueados.

### No cubre
- Pruebas de volumen masivo o picos extremos.
- Validaciones de experiencia visual fuera del flujo funcional.
- Reglas administrativas no definidas formalmente para perfiles distintos al medico.

## 3. Historias de Usuario

### HU-01 - Autenticacion de personal
Como medico, quiero iniciar sesion para acceder a funciones de atencion restringidas.

### HU-02 - Seleccion de consultorio
Como medico autenticado, quiero vincularme a un consultorio para iniciar mi operacion.

### HU-03 - Visualizacion de paciente
Como medico en operacion, quiero ver los datos del paciente en atencion para guiar la consulta.

### HU-04 - Gestion de disponibilidad
Como medico, quiero cambiar mi disponibilidad para controlar cuando puedo recibir pacientes.

### HU-05 - Finalizacion de atencion
Como medico, quiero cerrar una atencion y liberar el consultorio en el estado correcto.

## 4. Escenarios de Prueba

### HU-01

#### Escenario: Ingreso exitoso de medico
Condicion inicial: El medico tiene credenciales validas y permiso para operar.

Accion: El medico inicia sesion.

Resultado esperado: El sistema habilita las funciones de atencion.

#### Escenario: Ingreso con datos incorrectos
Condicion inicial: El medico ingresa datos no validos.

Accion: Intenta iniciar sesion.

Resultado esperado: El sistema rechaza el acceso y mantiene bloqueadas las funciones de atencion.

#### Escenario: Ingreso de persona sin permiso medico
Condicion inicial: Existe una persona con acceso general, pero sin permiso medico.

Accion: Intenta entrar al flujo medico.

Resultado esperado: El sistema niega acceso al flujo medico.

### HU-02

#### Escenario: Asociacion valida a consultorio libre
Condicion inicial: El medico no tiene consultorio asignado y el consultorio esta libre.

Accion: Solicita asociarse al consultorio.

Resultado esperado: El consultorio queda listo para recibir pacientes.

#### Escenario: Intento sobre consultorio ocupado
Condicion inicial: El consultorio ya esta en uso por otro medico.

Accion: Un segundo medico intenta asociarse al mismo consultorio.

Resultado esperado: El sistema rechaza la asociacion y mantiene la asignacion actual.

#### Escenario: Medico con consultorio previo intenta nueva asociacion
Condicion inicial: El medico ya esta asociado a otro consultorio.

Accion: Intenta tomar un segundo consultorio.

Resultado esperado: El sistema bloquea la accion.

### HU-03

#### Escenario: Visualizacion de paciente durante atencion activa
Condicion inicial: El consultorio tiene una atencion en curso.

Accion: El medico revisa su vista operativa.

Resultado esperado: Visualiza nombre y documento del paciente en atencion.

#### Escenario: Sin paciente en curso
Condicion inicial: El consultorio esta habilitado, pero sin atencion activa.

Accion: El medico revisa su vista operativa.

Resultado esperado: El sistema informa que no hay paciente en atencion.

### HU-04

#### Escenario: Cambiar a no disponible sin atencion activa
Condicion inicial: El consultorio esta activo y no hay paciente en curso.

Accion: El medico marca no disponible.

Resultado esperado: El consultorio deja de recibir nuevos pacientes.

#### Escenario: Volver a disponible
Condicion inicial: El consultorio esta marcado como no disponible.

Accion: El medico marca disponible.

Resultado esperado: El consultorio vuelve a quedar habilitado para recibir pacientes.

#### Escenario: Solicitar no disponible durante atencion activa
Condicion inicial: Existe una consulta en curso.

Accion: El medico solicita pasar a no disponible.

Resultado esperado: La consulta no se interrumpe y el cambio aplica al finalizar.

### HU-05

#### Escenario: Finalizacion valida de atencion
Condicion inicial: Hay una consulta activa en el consultorio.

Accion: El medico finaliza la consulta.

Resultado esperado: El paciente deja de estar en atencion y el consultorio pasa al estado correspondiente.

#### Escenario: Abandono de consultorio sin consulta activa
Condicion inicial: El consultorio no tiene consulta en curso.

Accion: El medico abandona el consultorio.

Resultado esperado: El consultorio queda libre de medico.

#### Escenario: Intento de finalizacion fuera de orden
Condicion inicial: No existe consulta activa.

Accion: Se intenta finalizar una atencion.

Resultado esperado: El sistema rechaza la accion por orden invalido.

## 5. Validacion del Modelo de Estados

### Estados cubiertos
- SinMedico
- ConMedicoDisponible
- EnAtencion
- ConMedicoNoDisponible

### Transiciones validas
- SinMedico -> ConMedicoDisponible: asociacion correcta de medico.
- ConMedicoDisponible -> EnAtencion: inicio de consulta.
- ConMedicoDisponible -> ConMedicoNoDisponible: pausa operativa sin consulta activa.
- ConMedicoNoDisponible -> ConMedicoDisponible: reactivacion.
- EnAtencion -> ConMedicoDisponible: cierre normal.
- EnAtencion -> ConMedicoNoDisponible: cierre con pausa diferida.
- ConMedicoDisponible -> SinMedico: abandono sin consulta activa.
- ConMedicoNoDisponible -> SinMedico: abandono sin consulta activa.

### Transiciones invalidas
- Iniciar consulta sin medico asociado.
- Iniciar consulta desde estado no disponible.
- Finalizar consulta sin consulta activa.
- Abandonar consultorio con consulta activa.
- Tomar dos consultorios al mismo tiempo por el mismo medico.

## 6. Escenarios Criticos

### Conflicto por el mismo consultorio
- Dos medicos intentan tomar el mismo consultorio al mismo tiempo.
- Resultado esperado: solo una asociacion se confirma y la otra se rechaza.

### Acciones fuera de orden
- Se intenta cerrar una consulta que no existe.
- Se intenta iniciar una consulta cuando el consultorio no esta habilitado.
- Resultado esperado: el sistema bloquea acciones fuera de secuencia.

### Estado inconsistente por cambios simultaneos
- Se solicita cambio de disponibilidad durante una consulta en curso.
- Resultado esperado: el sistema conserva la consulta activa y aplica el cambio al cierre.

### Errores de negocio en operacion
- Medico sin asociacion intenta operar acciones de consultorio.
- Medico no disponible intenta recibir paciente.
- Resultado esperado: el sistema rechaza la accion y mantiene consistencia operativa.

### Reglas pendientes de definicion
- [DECISION REQUERIDA] Quien puede reasignar un consultorio ya ocupado en caso de contingencia.
- [DECISION REQUERIDA] Prioridad de atencion cuando dos pacientes quedan listos al mismo tiempo para el mismo consultorio.
- [DECISION REQUERIDA] Tiempo maximo permitido para dejar una consulta en curso sin cierre.

## 7. Riesgos de Negocio Cubiertos
- Doble asignacion de consultorio y conflicto operativo entre medicos.
- Atenciones cerradas fuera de orden que afecten trazabilidad del servicio.
- Exposicion de funciones medicas a personas sin permiso.
- Pausas operativas mal aplicadas que interrumpan consultas activas.
- Inconsistencias en la continuidad de atencion del paciente.
