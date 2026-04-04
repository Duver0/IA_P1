# Plan de Pruebas de Gestion de Consultorios y Sesiones Medicas

## 1. Portada e Introduccion
Este informe formal presenta la validacion del sistema de gestion de turnos medicos en la parte de consultorios y sesiones de atencion. Su objetivo es confirmar que las reglas de negocio se cumplen de forma consistente en escenarios normales, escenarios de error y situaciones de alta sensibilidad operativa. El documento esta redactado para facilitar decisiones de liberacion por parte de responsables de negocio y de calidad.

**Sistema evaluado:** Plataforma de gestion de turnos medicos  
**Capacidad evaluada:** Gestion de consultorios y sesiones medicas  
**Fecha:** 4 de abril de 2026  
**Responsable del plan:** Lider Senior de Calidad

### Proposito del plan de pruebas
- Garantizar que el flujo de atencion medica se ejecute de manera segura, ordenada y predecible.
- Reducir el riesgo de asignaciones invalidas de consultorio y de cierres fuera de secuencia.
- Aportar evidencia verificable para decidir salida a operacion.

### Alcance
**Flujos de negocio cubiertos**
- Autenticacion del medico y control de acceso segun rol.
- Vinculacion del medico a consultorio.
- Visualizacion del paciente durante atencion activa.
- Gestion de disponibilidad del medico.
- Finalizacion de atencion y liberacion del consultorio.
- Validacion de cambios de estado permitidos y bloqueados.

**Flujos fuera de alcance**
- Escenarios de volumen extremo o picos excepcionales.
- Evaluacion estetica o de estilo visual fuera del flujo principal del negocio.
- Reglas administrativas no formalizadas para perfiles distintos al medico.

### Audiencia objetivo
- Lideres de negocio y responsables de operacion asistencial.
- Equipo de calidad y responsables de liberacion.
- Patrocinadores de negocio y evaluadores no tecnicos.

## 2. Los 7 Principios de las Pruebas aplicados al sistema
La estrategia de validacion de esta capacidad se construye sobre principios internacionales de calidad, adaptados al contexto de atencion medica. Cada principio se interpreta en lenguaje de negocio para facilitar su aplicacion en decisiones reales de riesgo y continuidad. A continuacion se describe su aplicacion concreta en este sistema.

### 2.1 Las pruebas demuestran la presencia de defectos, no su ausencia
- **Significado para este sistema:** El hecho de obtener resultados favorables no elimina por completo la posibilidad de fallas futuras en operacion.
- **Aplicacion en la estrategia:** Se priorizan escenarios de alto impacto y se deja registro de riesgos residuales abiertos.
- **Ejemplo real:** Aunque el cierre de atencion se valida con exito, se mantiene vigilancia sobre cierres fuera de orden en situaciones no previstas.

### 2.2 Las pruebas exhaustivas son imposibles
- **Significado para este sistema:** No es viable evaluar todas las combinaciones de estados, perfiles y momentos operativos.
- **Aplicacion en la estrategia:** Se seleccionan escenarios criticos por riesgo de negocio: acceso, vinculacion, disponibilidad y cierre.
- **Ejemplo real:** Se cubren transiciones de estado validas e invalidas mas relevantes en lugar de intentar todas las secuencias posibles.

### 2.3 Las pruebas tempranas ahorran tiempo y dinero
- **Significado para este sistema:** Detectar fallas en etapas iniciales evita reprocesos y detenciones de servicio en atencion real.
- **Aplicacion en la estrategia:** Las validaciones de reglas clave se ejecutan desde el inicio del ciclo y antes de pruebas de flujo completo.
- **Ejemplo real:** La regla que evita doble vinculacion de medico se valida primero para impedir impacto en etapas posteriores.

### 2.4 Agrupacion de defectos
- **Significado para este sistema:** Una parte limitada del flujo suele concentrar la mayor cantidad de incidencias.
- **Aplicacion en la estrategia:** Se incrementa profundidad de validacion en autenticacion, cambio de estado y cierre de atencion.
- **Ejemplo real:** Los escenarios de consultorio ocupado y cambio de disponibilidad durante atencion reciben mayor densidad de casos.

### 2.5 La paradoja del pesticida
- **Significado para este sistema:** Repetir siempre los mismos casos reduce la capacidad de descubrir fallas nuevas.
- **Aplicacion en la estrategia:** Se renuevan escenarios con variaciones de secuencia, tiempo y combinacion de condiciones de entrada.
- **Ejemplo real:** Ademas del flujo ideal, se valida la solicitud de no disponible cuando la atencion sigue activa.

### 2.6 Las pruebas dependen del contexto
- **Significado para este sistema:** La calidad requerida en salud exige priorizar continuidad asistencial y seguridad operativa.
- **Aplicacion en la estrategia:** Se asigna prioridad alta a validaciones que puedan afectar acceso medico, asignacion de consultorio y cierre correcto.
- **Ejemplo real:** El rechazo de acceso para persona sin rol medico se clasifica como verificacion obligatoria de maxima prioridad.

### 2.7 La falacia de la ausencia de errores
- **Significado para este sistema:** Un sistema puede mostrar pocos errores y aun asi no cumplir una necesidad clave del negocio.
- **Aplicacion en la estrategia:** No solo se valida que "no falle"; tambien se confirma que resuelva el flujo asistencial esperado.
- **Ejemplo real:** No basta con permitir ingreso; se exige que el medico pueda completar todo el ciclo hasta liberar consultorio.

## 3. Estrategia Multinivel de Pruebas
Para asegurar cobertura de negocio de extremo a extremo, se adopta una estrategia en cuatro niveles complementarios. Cada nivel responde una pregunta distinta y reduce un tipo de riesgo especifico, desde reglas puntuales hasta recorridos completos del usuario. La combinacion de niveles permite tomar decisiones de liberacion con evidencia gradual, acumulativa y trazable.

| Nivel de verificacion | Pregunta de negocio que responde | Parte del sistema que verifica | Responsable principal | Modalidad y ubicacion de ejecucion | Ventajas | Limitaciones |
|---|---|---|---|---|---|---|
| Verificacion de reglas de negocio individuales | ¿Cada regla critica se cumple en forma aislada? | Reglas de acceso, vinculacion, cambios de estado y cierre | Analista de calidad de negocio | Automatizada en el espacio principal del sistema | Deteccion temprana de desalineaciones de regla | No representa por si sola el recorrido completo del usuario |
| Verificacion de comportamiento de una seccion del sistema de forma aislada | ¿La seccion operativa del medico responde correctamente segun estado? | Vista operativa del medico y controles de accion visibles | Analista de calidad de negocio y calidad de experiencia | Mixta: automatizada y apoyo manual en el espacio principal del sistema | Alta claridad sobre comportamiento operativo local | Puede omitir impactos de comunicacion con otras areas |
| Verificacion de comunicacion entre areas del sistema | ¿Las acciones del medico se reflejan de forma coherente en todo el sistema? | Transferencia de estado entre autenticacion, consultorio y atencion | Lider de Calidad y analista de calidad integral | Automatizada en el espacio principal del sistema | Confirma consistencia transversal del negocio | Requiere mayor coordinacion de datos y tiempos de ejecucion |
| Verificacion del flujo completo desde la perspectiva del usuario final | ¿El medico puede completar el flujo real sin rupturas? | Recorrido integral: ingreso, vinculacion, atencion, cierre y liberacion | Equipo de calidad de negocio | Automatizada en espacios externos de automatizacion: Automatizacion de interfaz de usuario con modelo por paginas; Automatizacion de interfaz de usuario con guion de actor; Automatizacion de operaciones del sistema con guion de actor | Evidencia directa para aprobacion de salida a operacion | Mayor costo de mantenimiento y tiempos de ciclo mas amplios |

## 4. Tipos de Pruebas: Caja Blanca vs Caja Negra
La validacion integral requiere observar el sistema desde dos enfoques complementarios. Uno se orienta a resultados visibles del negocio y el otro confirma que las reglas internas definidas para el flujo de atencion se respeten de forma consistente. Usar ambos enfoques permite mayor confianza antes de liberar.

### Caja Negra (verificacion desde afuera)
- **Definicion de negocio:** Evalua si el sistema entrega el resultado esperado del negocio sin enfocarse en su forma interna de construccion.
- **Cuando y por que se usa:** Se usa cuando importa la experiencia real del medico y del proceso asistencial completo.
- **Niveles que la aplican:** Principalmente nivel 3 y nivel 4, y parte del nivel 2.
- **Ejemplo concreto en esta feature:** El medico marca no disponible y el sistema bloquea nuevos pacientes sin interrumpir la atencion activa.

### Caja Blanca (verificacion desde adentro)
- **Definicion de negocio:** Evalua de manera detallada que cada regla de negocio interna se cumpla en escenarios controlados.
- **Cuando y por que se usa:** Se usa para detectar desviaciones tempranas en reglas sensibles antes de avanzar a validaciones de mayor alcance.
- **Niveles que la aplican:** Principalmente nivel 1 y parte del nivel 2.
- **Ejemplo concreto en esta feature:** Se verifica de forma aislada que una transicion invalida de estado sea bloqueada.

## 5. Plan de Pruebas por Nivel
Esta seccion detalla los casos de validacion definidos para cada nivel de cobertura. Los casos estan priorizados por impacto en continuidad asistencial, seguridad de acceso y consistencia de estados del consultorio. Cada tabla puede usarse como base operativa para ejecucion, seguimiento y aprobacion formal.

### 5.1 Nivel 1: Verificacion de reglas de negocio individuales
| ID | Nombre del caso | Flujo de negocio que verifica | Condiciones de entrada | Resultado esperado del negocio | Tipo (Caja Blanca / Negra) | Prioridad |
|----|-----------------|-------------------------------|------------------------|--------------------------------|----------------------------|-----------|
| TC-U01 | Ingreso valido con rol medico | Autenticacion del medico con permiso correcto | Medico registrado con credenciales vigentes y rol medico | Se habilita acceso al flujo de atencion | Caja Blanca | Alta |
| TC-U02 | Rechazo por credenciales incorrectas | Control de acceso ante datos invalidos | Intento de ingreso con credenciales no validas | Se niega el acceso y se mantiene restriccion operativa | Caja Blanca | Alta |
| TC-U03 | Rechazo por rol no medico | Control de acceso por rol | Persona registrada sin rol medico | El sistema bloquea ingreso al flujo medico | Caja Blanca | Alta |
| TC-U04 | Vinculacion valida a consultorio libre | Asignacion inicial de consultorio | Medico autenticado sin consultorio y consultorio libre | El medico queda vinculado y listo para atender | Caja Blanca | Alta |
| TC-U05 | Rechazo de vinculacion a consultorio ocupado | Prevencion de doble asignacion de consultorio | Consultorio ya vinculado por otro medico | Se rechaza la accion y se conserva la asignacion vigente | Caja Blanca | Alta |
| TC-U06 | Transicion valida de estado del consultorio | Cambio permitido de estado segun secuencia | Consultorio con medico disponible y sin atencion activa | El estado cambia a medico no disponible temporalmente | Caja Blanca | Media |
| TC-U07 | Bloqueo de transicion invalida | Prevencion de secuencias fuera de regla | Solicitud de cierre sin atencion activa | El sistema rechaza la accion por orden invalido | Caja Blanca | Alta |
| TC-U08 | Finalizacion de atencion con paciente asignado | Cierre correcto de sesion de atencion | Consultorio en atencion activa con paciente asignado | Se libera al paciente y el consultorio pasa al estado correspondiente | Caja Blanca | Alta |

### 5.2 Nivel 2: Verificacion de comportamiento de una seccion del sistema de forma aislada
| ID | Nombre del caso | Flujo de negocio que verifica | Condiciones de entrada | Resultado esperado del negocio | Tipo (Caja Blanca / Negra) | Prioridad |
|----|-----------------|-------------------------------|------------------------|--------------------------------|----------------------------|-----------|
| TC-C01 | Vista del medico refleja estado real | Visualizacion del estado del consultorio | Medico autenticado con consultorio vinculado en un estado definido | El panel muestra el estado correcto del consultorio | Caja Negra | Alta |
| TC-C02 | Acciones visibles segun estado actual | Control de opciones operativas del medico | Consultorio en cada estado de negocio definido | Solo se muestran acciones permitidas para ese estado | Caja Negra | Alta |
| TC-C03 | Datos del paciente solo en atencion activa | Confidencialidad y pertinencia de informacion | Consultorio con y sin atencion activa | La informacion del paciente aparece solo cuando corresponde | Caja Negra | Alta |
| TC-C04 | Mensaje de accion en proceso | Comunicacion operativa durante ejecucion | Medico inicia accion de cambio de estado o cierre | El sistema informa que la accion esta en curso hasta su resultado | Caja Negra | Media |
| TC-C05 | Seleccion de tipo de usuario en registro | Alta correcta de perfil medico | Persona en proceso de registro | Se permite seleccionar tipo de usuario medico | Caja Blanca | Media |
| TC-C06 | Bloqueo de acciones no validas por estado | Control de secuencia operativa | Medico intenta accion no permitida para el estado actual | El sistema bloquea la accion y mantiene consistencia del flujo | Caja Blanca | Alta |

### 5.3 Nivel 3: Verificacion de comunicacion entre areas del sistema
| ID | Nombre del caso | Flujo de negocio que verifica | Condiciones de entrada | Resultado esperado del negocio | Tipo (Caja Blanca / Negra) | Prioridad |
|----|-----------------|-------------------------------|------------------------|--------------------------------|----------------------------|-----------|
| TC-I01 | Inicio de sesion actualiza sesion operativa | Continuidad de acceso del medico | Medico con credenciales vigentes y rol medico | La sesion del medico queda activa para operar consultorio | Caja Negra | Alta |
| TC-I02 | Vinculacion reflejada en estado general | Coherencia de asignacion de consultorio | Medico autenticado solicita consultorio libre | El estado general muestra consultorio con medico disponible | Caja Negra | Alta |
| TC-I03 | Asignacion de paciente cambia estado a atencion activa | Inicio de atencion y trazabilidad de estado | Consultorio con medico disponible y paciente listo | El sistema registra atencion activa en todo el flujo | Caja Negra | Alta |
| TC-I04 | Finalizacion libera paciente y consultorio | Cierre transversal de atencion | Consultorio con atencion activa | El paciente sale de atencion y el consultorio queda habilitado segun regla | Caja Negra | Alta |
| TC-I05 | No disponible bloquea nuevos pacientes | Control de disponibilidad operativa | Medico marca no disponible temporalmente | Se bloquea ingreso de nuevos pacientes al consultorio | Caja Negra | Alta |
| TC-I06 | Registro con rol medico habilita acceso operativo | Habilitacion de capacidades segun rol | Persona registrada como medico | Queda habilitado el acceso a acciones medicas permitidas | Caja Negra | Media |

### 5.4 Nivel 4: Verificacion del flujo completo desde la perspectiva del usuario final
| ID | Nombre del caso | Flujo de negocio que verifica | Condiciones de entrada | Resultado esperado del negocio | Tipo (Caja Blanca / Negra) | Prioridad |
|----|-----------------|-------------------------------|------------------------|--------------------------------|----------------------------|-----------|
| TC-E01 | Flujo completo de atencion medica | Ingreso, vinculacion, atencion y cierre en secuencia | Medico valido, consultorio libre y paciente disponible | El ciclo completo finaliza sin ruptura y con estado final correcto | Caja Negra | Alta |
| TC-E02 | Rechazo de acceso sin credenciales validas | Seguridad de acceso inicial | Intento de ingreso con datos no validos | El sistema niega acceso al panel medico | Caja Negra | Alta |
| TC-E03 | Registro medico y acceso posterior | Alta de medico y uso operativo posterior | Persona nueva completa registro como medico | Puede ingresar y acceder a acciones medicas autorizadas | Caja Negra | Media |
| TC-E04 | Pausa operativa y bloqueo de asignacion | Gestion de no disponibilidad | Medico con consultorio activo marca no disponible | El sistema bloquea nuevos pacientes segun regla de negocio | Caja Negra | Alta |
| TC-E05 | Liberacion de consultorio sin atencion activa | Cierre de vinculacion del medico | Medico vinculado sin paciente en atencion | El consultorio queda sin medico asignado | Caja Negra | Media |
| TC-E06 | Visualizacion de paciente durante atencion activa | Seguimiento del paciente en curso | Consultorio con atencion activa | El medico visualiza informacion del paciente en atencion | Caja Negra | Alta |

## 6. Matriz de Trazabilidad
La trazabilidad asegura que cada historia de usuario tenga respaldo de validacion en todos los niveles definidos. Esta matriz permite identificar vacios de cobertura y justificar el estado de preparacion para entrega. Tambien facilita auditoria de negocio ante cliente o evaluador.

| Historia de Usuario | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 | Cobertura |
|--------------------|---------|---------|---------|---------|-----------|
| HU-01: Autenticacion del medico | TC-U01, TC-U02, TC-U03 | TC-C05, TC-C06 | TC-I01, TC-I06 | TC-E01, TC-E02, TC-E03 | Completa |
| HU-02: Seleccion y vinculacion a consultorio | TC-U04, TC-U05 | TC-C01, TC-C02, TC-C06 | TC-I02 | TC-E01, TC-E05 | Completa |
| HU-03: Visualizacion del paciente en atencion | TC-U08 | TC-C03 | TC-I03, TC-I04 | TC-E01, TC-E06 | Completa |
| HU-04: Gestion de disponibilidad del medico | TC-U06, TC-U07 | TC-C02, TC-C06 | TC-I05 | TC-E04 | Completa |
| HU-05: Finalizacion de atencion y liberacion del consultorio | TC-U08 | TC-C01, TC-C02 | TC-I04 | TC-E01, TC-E05 | Completa |

## 7. Criterios de Aceptacion del Plan
Estos criterios establecen la linea minima para considerar que la capacidad esta suficientemente verificada para salida controlada. La decision final combina porcentaje de ejecucion, severidad de incidencias y riesgo residual aceptado por negocio. Sin cumplimiento de estos umbrales no se recomienda avanzar a liberacion.

### 7.1 Porcentaje minimo de casos ejecutados por nivel
| Nivel | Porcentaje minimo de ejecucion | Porcentaje minimo favorable | Regla adicional |
|---|---|---|---|
| Nivel 1 | 100% | 98% | Casos de prioridad alta: 100% favorables |
| Nivel 2 | 95% | 95% | Sin incidencias altas abiertas |
| Nivel 3 | 95% | 95% | Sin inconsistencias de estado entre areas |
| Nivel 4 | 90% | 90% | Flujos criticos TC-E01, TC-E02 y TC-E04 favorables |

### 7.2 Condiciones de bloqueo
- Cualquier incidencia alta que permita acceso de persona sin rol medico al flujo de atencion.
- Cualquier incidencia alta que permita doble asignacion de consultorio.
- Cualquier incidencia alta que permita cierre de atencion fuera de secuencia.
- Cualquier incidencia alta que rompa la coherencia del estado del consultorio durante atencion activa.

### 7.3 Condiciones de advertencia
- Incidencias medias sin impacto en seguridad del acceso ni continuidad asistencial.
- Mensajes operativos poco claros que no impiden completar el flujo principal.
- Ajustes de baja prioridad con plan formal de correccion y fecha comprometida.

## 8. Glosario de Negocio
El siguiente glosario estandariza el significado de terminos clave para evitar interpretaciones ambiguas entre areas de negocio, operacion y calidad. Todas las definiciones se expresan en lenguaje de negocio y orientado a la atencion medica. Su uso unificado mejora la consistencia en ejecucion y reporte.

| Termino | Definicion en lenguaje de negocio |
|---|---|
| Consultorio | Espacio de atencion asignable a un medico para recibir pacientes dentro del flujo operativo. |
| Estado del consultorio | Situacion vigente del consultorio que determina que acciones estan permitidas o bloqueadas. |
| Sesion de atencion | Periodo en el que un medico atiende a un paciente desde inicio hasta cierre. |
| Medico disponible | Estado en el que el medico puede recibir nuevos pacientes en su consultorio. |
| Medico no disponible | Estado temporal en el que el medico no recibe nuevos pacientes, sin perder su vinculacion. |
| Vinculacion | Accion mediante la cual el medico toma un consultorio para iniciar su operacion. |
| Liberacion | Accion de dejar el consultorio sin medico asignado cuando no hay atencion activa. |
| Atencion activa | Estado en el que existe un paciente en consulta con seguimiento en curso. |
| Verificacion aislada | Validacion enfocada en una regla o una seccion especifica del sistema, en condiciones controladas. |
| Verificacion de flujo completo | Validacion del recorrido integral del usuario desde inicio hasta cierre del proceso. |
| Caja Blanca | Enfoque de validacion detallada de reglas internas de negocio para detectar desviaciones tempranas. |
| Caja Negra | Enfoque de validacion de resultados visibles del negocio sin centrarse en su construccion interna. |
