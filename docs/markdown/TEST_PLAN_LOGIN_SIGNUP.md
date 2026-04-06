# Plan de Pruebas — Sistema de Turnos EPS

**Proyecto:** Sistema de turnos EPS  
**Alcance principal:** autenticación de usuarios y creación de turnos  
**Responsables:** David Angarita y Duver Betancur  
**Fecha:** 2026-03-09  
**Versión:** 3.1

---

## 1. ALCANCE DE LAS PRUEBAS

### 1.1 Descripción del proceso

Este plan valida los comportamientos funcionales más importantes del sistema en dos frentes:

1. **Registro de usuario:** una persona puede crear su cuenta ingresando sus datos básicos y una contraseña válida.
2. **Inicio de sesión:** una persona registrada puede autenticarse para ingresar al sistema.
3. **Control de acceso:** el sistema restringe el ingreso a zonas privadas cuando el usuario no ha iniciado sesión o no cuenta con el perfil requerido.
4. **Restauración de sesión:** al volver a entrar o recargar, el sistema conserva la sesión si sigue siendo válida.
5. **Creación de turnos:** el sistema recibe solicitudes de turnos y responde según la información suministrada.

### 1.2 Procesos bajo prueba

| Proceso | Objetivo de validación |
| :--- | :--- |
| Registro de usuario | Confirmar que el sistema permite crear cuentas con datos válidos y rechaza datos incorrectos o duplicados |
| Inicio de sesión | Confirmar que el acceso funciona con credenciales correctas y muestra mensajes claros ante errores |
| Control de acceso | Confirmar que solo los usuarios autorizados pueden ingresar a las secciones restringidas |
| Persistencia de sesión | Confirmar que una sesión válida se mantiene y que una sesión inexistente o vencida obliga a autenticarse de nuevo |
| Solicitud de turnos | Confirmar que el sistema acepta solicitudes completas y rechaza solicitudes incompletas |

### 1.3 Fuera de alcance

- Evaluación de desempeño, carga o estrés.
- Validación comparativa en múltiples navegadores o dispositivos reales.
- Pruebas detalladas de módulos distintos a autenticación y creación de turnos.
- Validaciones visuales o de experiencia de usuario fuera del flujo funcional definido.

---

## 2. ESTRATEGIA DE PRUEBAS

### 2.1 Niveles de prueba

**Pruebas funcionales de interfaz**  
Verifican el comportamiento visible para la persona usuaria en formularios, mensajes, validaciones y redirecciones.

**Pruebas de integración funcional**  
Verifican que las solicitudes y respuestas entre el sistema y los servicios de autenticación mantengan el comportamiento esperado.

**Pruebas de aceptación del negocio**  
Verifican escenarios completos descritos en lenguaje de negocio, enfocados en el resultado esperado y no en detalles de implementación.

### 2.2 Técnicas aplicadas

| Técnica | Aplicación en el proyecto |
| :--- | :--- |
| Partición de equivalencia | Separar datos válidos e inválidos en registro e inicio de sesión |
| Análisis de valores límite | Validar longitudes mínimas y reglas críticas de contraseña |
| Tabla de decisiones | Cubrir combinaciones de acceso según autenticación y perfil del usuario |
| Transición de estados | Revisar el paso entre sesión cargando, sesión activa y sesión no disponible |
| Validación de consistencia | Comprobar que la información enviada y recibida conserve el significado esperado |
| Escenarios de negocio | Describir comportamientos completos de registro, autenticación y creación de turnos |

### 2.3 Momentos de ejecución

1. **Durante el desarrollo de cada historia:** para detectar fallas tempranas.
2. **Al cierre de cada funcionalidad:** para confirmar que se cumplieron los criterios de aceptación.
3. **Antes de una entrega o liberación:** para validar que los flujos principales siguen funcionando.
4. **En regresión funcional:** cuando haya cambios sobre autenticación, permisos o turnos.

---

## 3. HISTORIAS DE USUARIO Y CRITERIOS DE ACEPTACIÓN

### HU-AUTH-01: Registro de usuario

**Descripción:** Como usuario nuevo, quiero registrarme con nombre, correo y contraseña para acceder al sistema.

**Criterios de aceptación:**
- El sistema no permite continuar si el usuario deja algún campo vacío.
- El sistema no permite registrarse con una contraseña que no tenga al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial; en ese caso muestra un mensaje explicando el requisito incumplido.
- Al crear la cuenta exitosamente, el usuario es llevado a la pantalla de inicio de sesión y ve un mensaje confirmando que su cuenta fue creada.
- Si el correo ingresado ya pertenece a una cuenta existente, el usuario no es redirigido y se le informa que ese correo ya está registrado.
- El sistema limpia y valida las entradas del usuario antes de procesarlas.

### HU-AUTH-02: Inicio de sesión

**Descripción:** Como usuario registrado, quiero iniciar sesión con correo y contraseña para acceder al panel principal.

**Criterios de aceptación:**
- El sistema no permite continuar si el correo o la contraseña están en blanco.
- Al ingresar credenciales correctas, el usuario accede al panel principal y su sesión queda activa.
- Si las credenciales son incorrectas, el usuario ve un mensaje de error sin ser redirigido.
- Si el usuario llega después de registrarse con éxito, ve un mensaje de bienvenida confirmando la creación de su cuenta; ese mensaje no vuelve a aparecer al recargar.
- El mensaje de bienvenida desaparece automáticamente a los 4 segundos.

### HU-AUTH-03: Protección de acceso por autenticación y rol

**Descripción:** Como sistema, quiero proteger las secciones que requieren autenticación o permisos específicos para evitar accesos no autorizados.

**Criterios de aceptación:**
- Un usuario que no ha iniciado sesión no puede acceder a secciones privadas; el sistema lo lleva automáticamente a la pantalla de ingreso.
- Un usuario autenticado que no tiene el perfil requerido para una sección es enviado a la página principal sin ver el contenido restringido.
- Un usuario autenticado con el perfil correcto puede ver y usar la sección sin interrupciones.
- Mientras el sistema verifica la sesión del usuario, no se muestra contenido restringido.

### HU-AUTH-04: Restauración de sesión

**Descripción:** Como usuario, quiero que mi sesión se restaure al recargar la página para no tener que autenticarme nuevamente.

**Criterios de aceptación:**
- Al recargar la página, el sistema verifica automáticamente si el usuario ya tiene una sesión activa.
- Si existe una sesión válida, el usuario permanece autenticado y puede continuar usando la aplicación sin interrupciones.
- Si no existe sesión activa o la sesión expiró, el usuario es tratado como no autenticado y debe iniciar sesión nuevamente.

### HU-TUR-01: Solicitud de turno

**Descripción:** Como paciente, quiero solicitar un turno con mis datos para que el sistema procese mi atención.

**Criterios de aceptación:**
- El sistema acepta una solicitud completa y confirma que fue recibida para procesamiento.
- Si no se informa prioridad, el sistema asigna la prioridad por defecto definida por negocio.
- Si faltan datos obligatorios, el sistema rechaza la solicitud e informa el error.

---

## 4. DISEÑO DE CASOS DE PRUEBA

### Suite 1 — Registro de usuario

| ID | Descripción | Precondición | Paso | Resultado esperado |
| :--- | :--- | :--- | :--- | :--- |
| TC-RU-01 | Contraseña sin mayúscula muestra error | Formulario disponible | Ingresar datos y enviar | Se informa que la contraseña no cumple la regla |
| TC-RU-02 | Contraseña menor al mínimo permitido muestra error | Formulario disponible | Ingresar datos y enviar | Se informa que la contraseña no cumple la longitud mínima |
| TC-RU-03 | Datos válidos permiten el registro | Formulario disponible | Ingresar nombre, correo y contraseña válidos | El registro se procesa correctamente |
| TC-RU-04 | Campos vacíos impiden continuar | Formulario disponible | Enviar sin completar datos | El sistema no procesa el registro |
| TC-RU-05 | Correo duplicado muestra mensaje claro | Existe una cuenta con ese correo | Ingresar datos y enviar | Se informa que el correo ya está registrado |
| TC-RU-06 | Registro exitoso muestra confirmación y lleva al ingreso | Datos válidos y correo no registrado | Completar registro | Se confirma la creación de la cuenta y se dirige al inicio de sesión |

### Suite 2 — Inicio de sesión

| ID | Descripción | Precondición | Paso | Resultado esperado |
| :--- | :--- | :--- | :--- | :--- |
| TC-IS-01 | Se informa al usuario que su cuenta fue creada | El usuario viene de un registro exitoso | Ingresar a la pantalla de inicio de sesión | Se muestra el mensaje de confirmación |
| TC-IS-02 | El mensaje de confirmación desaparece automáticamente | Mensaje visible | Esperar 4 segundos | El mensaje deja de mostrarse |
| TC-IS-03 | Credenciales incorrectas muestran error | Usuario no autenticado | Ingresar credenciales inválidas | Se muestra un mensaje de error |
| TC-IS-04 | Credenciales correctas permiten el acceso | Usuario registrado | Ingresar credenciales válidas | El usuario entra al panel principal |
| TC-IS-05 | Campos vacíos impiden continuar | Pantalla disponible | Enviar sin completar correo o contraseña | El sistema no procesa el inicio de sesión |

### Suite 3 — Control de acceso

| ID | Descripción | Estado | Resultado esperado |
| :--- | :--- | :--- | :--- |
| TC-CA-01 | Usuario no autenticado intenta entrar a zona privada | Sin sesión activa | El sistema lo dirige a la pantalla de ingreso |
| TC-CA-02 | El sistema está validando la sesión | Verificación en curso | No se muestra contenido restringido |
| TC-CA-03 | Usuario autenticado sin perfil permitido intenta acceder | Sesión activa, perfil insuficiente | El sistema lo envía a una zona permitida |
| TC-CA-04 | Usuario autenticado con perfil permitido accede | Sesión activa, perfil correcto | El contenido restringido se muestra |
| TC-CA-05 | Acceso autenticado sin restricción de perfil adicional | Sesión activa | El contenido se muestra |

### Suite 4 — Gestión de sesión

| ID | Descripción | Resultado esperado |
| :--- | :--- | :--- |
| TC-GS-01 | El sistema exige estar dentro del flujo de autenticación | Se informa el uso incorrecto si se consulta fuera del contexto esperado |
| TC-GS-02 | Mientras se valida la sesión, el estado inicial es de espera | El sistema se mantiene en estado de carga |
| TC-GS-03 | Sin sesión activa, el usuario queda como no autenticado | No hay usuario autenticado |
| TC-GS-04 | Con sesión válida, el usuario queda autenticado | Se conservan los datos de la sesión |
| TC-GS-05 | Inicio de sesión exitoso actualiza el estado del usuario | El usuario queda autenticado |
| TC-GS-06 | Inicio de sesión fallido conserva el estado no autenticado | Se informa el error correspondiente |
| TC-GS-07 | Cierre de sesión limpia el acceso activo | El usuario vuelve al estado no autenticado |
| TC-GS-08 | Validación de perfil correcto | El sistema reconoce el perfil esperado |
| TC-GS-09 | Validación de perfil incorrecto | El sistema niega el perfil no correspondiente |

### Suite 5 — Integración con el servicio de autenticación

| ID | Descripción | Situación | Resultado esperado |
| :--- | :--- | :--- | :--- |
| TC-SA-01 | Inicio de sesión exitoso conserva la sesión y devuelve los datos del usuario | Respuesta exitosa del servicio | El usuario queda autenticado y sus datos son consistentes |
| TC-SA-02 | Inicio de sesión fallido no conserva sesión | Respuesta de rechazo | El sistema informa el error y no deja sesión activa |
| TC-SA-03 | Falla de comunicación durante el inicio de sesión | Error del servicio | El sistema informa un error de acceso |
| TC-SA-04 | Registro envía la información esperada | Solicitud de registro | El servicio recibe nombre, correo, contraseña y perfil según negocio |
| TC-SA-05 | El registro exitoso no inicia sesión automáticamente | Respuesta exitosa de registro | El usuario debe ingresar después de crear su cuenta |
| TC-SA-06 | Restauración de sesión con sesión existente | Existe sesión válida | El sistema recupera los datos del usuario |
| TC-SA-07 | Restauración de sesión sin sesión existente | No existe sesión activa | El sistema mantiene estado no autenticado |
| TC-SA-08 | Cierre de sesión elimina la sesión activa | Usuario autenticado | La sesión deja de estar disponible |
| TC-SA-09 | Perfil de empleado se interpreta correctamente | El servicio responde con perfil de empleado | El sistema reconoce al usuario como empleado |
| TC-SA-10 | Perfil de administrador se interpreta correctamente | El servicio responde con perfil de administrador | El sistema reconoce al usuario como administrador |

### Suite 6 — Creación de turno

Los siguientes escenarios describen el comportamiento esperado en lenguaje de negocio:

```gherkin
Feature: Creación de turno médico

  Scenario: Registrar turno con datos válidos y prioridad alta
    Given el sistema de turnos está disponible
    And no existe un turno previo para el paciente con cédula 123456789
    When el paciente "Juan Pérez" con cédula 123456789 solicita un turno con prioridad "alta"
    Then el sistema acepta el turno para procesamiento
    And la respuesta contiene estado "accepted"
    And la respuesta contiene mensaje "Turno en proceso de asignación"

  Scenario: Registrar turno sin especificar prioridad asigna prioridad por defecto
    Given no existe un turno previo para el paciente con cédula 987654321
    When el paciente "María López" con cédula 987654321 solicita un turno sin prioridad
    Then el sistema acepta el turno para procesamiento

  Scenario: Rechazar turno con datos incompletos
    When se envía una solicitud de turno sin nombre ni cédula
    Then el sistema rechaza la solicitud con error de validación
    And la respuesta indica que faltan datos obligatorios
```

| ID | Escenario | Estado inicial | Acción | Estado final esperado |
| :--- | :--- | :--- | :--- | :--- |
| TC-TU-01 | Turno válido con prioridad alta | Sistema disponible y sin turno previo | Solicitar turno con datos completos | Solicitud aceptada para procesamiento |
| TC-TU-02 | Turno sin prioridad informada | Sistema disponible y sin turno previo | Solicitar turno sin prioridad | Solicitud aceptada con prioridad por defecto |
| TC-TU-03 | Turno con datos incompletos | Sistema disponible | Enviar solicitud incompleta | Solicitud rechazada con mensaje de validación |

### Suite 7 — Registro e ingreso de usuario

Los siguientes escenarios describen resultados esperados del proceso de registro y autenticación:

```gherkin
Feature: Registro de usuario interno

  Scenario: Registrar un usuario nuevo con datos válidos
    Given el sistema de autenticación está disponible
    And no existe un usuario registrado con correo "nuevo@eps.com"
    When se registra un usuario con nombre "Carlos Medina", correo "nuevo@eps.com",
         contraseña "SecurePass1!" y rol "empleado"
    Then el registro es exitoso
    And se obtiene acceso válido al sistema
    And los datos del usuario contienen nombre "Carlos Medina" y rol "empleado"

  Scenario: Rechazar registro con correo ya existente
    Given existe un usuario registrado con correo "existente@eps.com"
    When se intenta registrar otro usuario con correo "existente@eps.com"
    Then el registro es rechazado
    And el mensaje de error indica que el correo ya está en uso

  Scenario: Iniciar sesión después de un registro exitoso
    Given existe un usuario registrado con correo "login@eps.com" y contraseña "SecurePass1!"
    When el usuario inicia sesión con correo "login@eps.com" y contraseña "SecurePass1!"
    Then la autenticación es exitosa
    And se obtiene acceso válido al sistema
```

| ID | Escenario | Estado inicial | Acción | Estado final esperado |
| :--- | :--- | :--- | :--- | :--- |
| TC-AU-01 | Registro exitoso | Correo no registrado | Registrar con datos válidos | Acceso válido y datos correctos |
| TC-AU-02 | Correo duplicado | Usuario existente con ese correo | Intentar un nuevo registro con el mismo correo | Registro rechazado con mensaje claro |
| TC-AU-03 | Inicio de sesión con usuario registrado | Usuario registrado previamente | Ingresar credenciales correctas | Autenticación exitosa |

---

## 5. REQUERIMIENTOS PARA LA EJECUCIÓN

1. Ambiente de pruebas disponible y estable.
2. Datos de prueba definidos para usuarios con perfiles distintos.
3. Casos y escenarios documentados antes de ejecutar la validación.
4. Acceso a evidencias de prueba para registrar resultados, hallazgos y correcciones.
5. Disponibilidad del equipo responsable para atender incidentes encontrados durante la ejecución.

---

## 6. MATRIZ DE RIESGOS

| Historia de Usuario | Probabilidad | Impacto | Riesgo (P×I) | Mitigación |
| :--- | :---: | :---: | :---: | :--- |
| HU-AUTH-01: Registro de usuario | 2 | 3 | **6** | Validar reglas de contraseña, duplicidad de correo y limpieza de datos |
| HU-AUTH-02: Inicio de sesión | 2 | 3 | **6** | Probar credenciales válidas, inválidas, mensajes y acceso al panel principal |
| HU-AUTH-03: Protección de acceso | 3 | 3 | **9** | Cubrir decisiones según sesión activa, sesión ausente y perfil autorizado |
| HU-AUTH-04: Restauración de sesión | 3 | 3 | **9** | Validar continuidad de sesión válida y tratamiento de sesión inexistente o vencida |
| HU-TUR-01: Solicitud de turno | 2 | 3 | **6** | Probar solicitud completa, prioridad por defecto y validación de datos faltantes |

*(Escala: 1 Bajo, 2 Medio, 3 Alto)*

**Riesgo de negocio:** una falla en autenticación o control de acceso puede impedir el uso normal del sistema o permitir ingresos no autorizados. Una falla en la solicitud de turnos puede afectar la atención oportuna del paciente.

---

## 8. DISTINCIÓN TÉCNICA: CAJA BLANCA vs CAJA NEGRA vs GHERKIN DECLARATIVO

Este plan se enfoca en el comportamiento funcional esperado del sistema, usando lenguaje orientado al negocio y a la validación del proyecto.

La evidencia de ejecución, los resultados detallados y los soportes de prueba se gestionan por separado.
