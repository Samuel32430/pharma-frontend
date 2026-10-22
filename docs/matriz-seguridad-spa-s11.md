# Matriz de Pruebas de la SPA Segura — Sesión 11

**Universidad Peruana Unión (UPeU)**  
**Facultad de Ingeniería y Arquitectura · Escuela Profesional de Ingeniería de Sistemas**  
**Asignatura:** Lenguaje de Programación II · Ciclo IV · Semestre 2026-2  
**Unidad II:** Frontend SPA empresarial seguro  
**Actividad Autónoma — Sesión 11:** Pruebas de la SPA segura, aviso previo a la expiración y página «Mi cuenta»  
**Estudiante:** Samuel Vilca  
**Docente:** Ing. Benjamin David Reyna Barreto  
**Fecha:** 24 de octubre de 2026  
**Rama:** `feature/seguridad-spa-pruebas-vilca`  

---

## 1. Resumen Consolidado de la Matriz de Pruebas

La presente matriz reúne 24 casos de prueba sistemáticos (16 casos base estipulados en la guía de sesión, 4 casos propios de grupos distintos y 4 casos correspondientes a la funcionalidad de aviso previo a la expiración).

| ID | Grupo | Caso de Prueba | Usuario | Pasos Principales | Resultado Esperado | Resultado Obtenido | Estado | Evidencia |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **L-01** | Login | Validación de formulario vacío | Anónimo | 1. Clic en «Ingresar» vacío.<br>2. Llenar solo usuario y enviar. | Mensajes de validación en rojo; ninguna petición HTTP en Red. | Formulario marca campos como touched; 0 peticiones en pestaña Red. | **PASA** | `L-01_red.png` |
| **L-02** | Login | Credenciales erróneas e inactivo | `no_existe`<br>`inactivo`<br>`admin` | Probar usuario inexistente, clave errónea y usuario inactivo. | Mismo mensaje genérico; contraseña se borra y usuario se conserva. | Alerta uniforme «Usuario o contraseña incorrectos», clave borrada, username preservado. | **PASA** | `L-02_login.png` |
| **L-03** | Login | Doble clic rápido en «Ingresar» | `admin` | Clic doble consecutivo con datos correctos. | Una sola petición `POST /auth/login`; botón se deshabilita durante el envío. | Botón pasa a `[disabled]` ("Ingresando…"); exactamente un POST registrado en Red. | **PASA** | `L-03_red.png` |
| **L-04** | Login | Prevención de redirección abierta | `vendedor` | Navegar a `/login?returnUrl=https://sitio-falso.com` y autenticarse. | Redirige a `/inicio`, nunca al sitio externo malicioso. | `destino()` detecta URL externa sin `/` relativo y transfiere a `/inicio`. | **PASA** | `L-04_url.png` |
| **S-01** | Sesión | Persistencia con F5 y cierre de ventana | `vendedor` | 1. Iniciar sesión y recargar con F5.<br>2. Cerrar navegador y reabrir. | Tras F5 la sesión sigue activa; tras cerrar el navegador solicita login. | `sessionStorage` sobrevive a F5 pero el ciclo de vida de pestaña limpia la sesión al cerrar. | **PASA** | `S-01_sesion.png` |
| **S-02** | Sesión | Invalidez de sesión con `expiraEn` pasado | `vendedor` | Editar en DevTools `expiraEn` a un instante pasado y pulsar F5. | La sesión guardada se descarta y aparece la pantalla de login. | `leerSesionGuardada()` detecta `Date.now() >= expiraEn`, elimina la clave y pide login. | **PASA** | `S-02_expira.png` |
| **S-03** | Sesión | Corrupción de clave en `sessionStorage` | Anónimo | Alterar `pharmasoft.sesion` con texto no JSON (ej. `xyz123`) y F5. | La SPA no se rompe: captura el error (try/catch) y muestra login. | `JSON.parse` lanza excepción interceptada por el bloque `catch`; sesión removida. | **PASA** | `S-03_storage.png` |
| **S-04** | Sesión | Concurrencia entre pestañas independientes | `almacen` | Abrir la SPA en dos pestañas; cerrar sesión en pestaña 1; navegar en pestaña 2. | Pestaña 2 continúa con sesión hasta requerir petición al backend o cerrar pestaña. | `sessionStorage` está aislado por pestaña; la pestaña 2 conserva sus datos localmente. | **PASA** | `S-04_pestanas.png` |
| **I-01** | Interceptor | Inyección selectiva del encabezado Bearer | `admin` | Inspeccionar en Red: `GET /productos`, `POST /auth/login` y recurso externo. | Solo peticiones dirigidas a `environment.apiUrl` llevan `Authorization: Bearer`. | `authInterceptor` filtra por prefijo de API; login y externos no llevan Bearer. | **PASA** | `I-01_red.png` |
| **I-02** | Interceptor | Resiliencia ante caída del backend | `vendedor` | Detener el servicio backend y navegar a `/productos`. | Mensaje de error de conexión en la UI; la sesión del usuario no se destruye. | `HttpErrorResponse` con status 0/504; `errorInterceptor` no cierra sesión porque no es 401. | **PASA** | `I-02_error.png` |
| **I-03** | Interceptor | Detección de token JWT adulterado | `vendedor` | Modificar un carácter del token en `sessionStorage` y abrir `/ventas`. | Backend responde 401; SPA expulsa al login con «Su sesión expiró». | Firma criptográfica rechazada en backend; interceptor redirige con `expirada=1`. | **PASA** | `I-03_red.png` |
| **G-01** | Guards | Bloqueo anónimo y guardado de `returnUrl` | Anónimo | Navegar directamente a `/productos/1/editar`, `/ventas/nueva`, `/inicio`. | En cada caso transfiere a login preservando `?returnUrl=<ruta>`. | `authGuard` bloquea el acceso sin sesión y añade el parámetro de retorno codificado. | **PASA** | `G-01_guard.png` |
| **G-02** | Guards | Control de privilegios de acceso (403) | `vendedor`<br>`almacen` | Vendedor visita `/categorias/nuevo`; Almacenero visita `/ventas/nueva`. | Pantalla «403 · Acceso denegado» en todas las rutas no autorizadas. | `permisoGuard` comprueba la lista de permisos requeridos y redirige a vista 403. | **PASA** | `G-02_403.png` |
| **M-01** | Menú | Visibilidad reactiva de menú y acciones | 4 usuarios | Iniciar sesión sucesivamente con admin, vendedor, almacen y supervisor. | Cada trabajador visualiza únicamente los enlaces y botones que le corresponden. | Menú computado reactivo y directiva `*appSiPermiso` podan elementos no autorizados. | **PASA** | `M-01_menu.png` |
| **M-02** | Menú | Cambio de usuario sin recargar página | `admin`<br>`almacen` | Cerrar sesión como admin e iniciar como almacenero sin recargar (F5). | El menú lateral se actualiza inmediatamente en caliente. | Signal `sesionActual` emite cambio y el `computed()` del menú se recalcula en memoria. | **PASA** | `M-02_computed.png` |
| **E-01** | 401/403 | Omisión de protección de interfaz en cliente | `vendedor` | Quitar directiva en DevTools del botón «Dar de baja» e intentar ejecutar. | El backend responde HTTP 403; la SPA muestra error y la sesión continúa. | Spring Security valida `@PreAuthorize` en el servidor y rechaza la acción forzada. | **PASA** | `E-01_consola.png` |
| **P-L01** | Login (Propio) | Inyección y caracteres especiales en formulario | Malicioso | Ingresar `' OR '1'='1` y scripts `<script>` en los campos de login. | Formulario valida longitud y el backend rechaza con 401 sin ejecutar SQL ni código. | Controles protegidos contra inyección; parámetros mapeados con seguridad. | **PASA** | `P-L01_sqli.png` |
| **P-S01** | Sesión (Propio) | Manipulación de privilegios en el cliente | `vendedor` | Editar en `sessionStorage` agregando rol `ADMIN` para forzar botones. | La interfaz renderiza botones pero cualquier petición al backend es denegada con 403. | El servidor valida la firma criptográfica HMAC-SHA del token JWT, no el storage. | **PASA** | `P-S01_tamper.png` |
| **P-I01** | Interceptor (Propio) | Expiración durante registro transaccional | `vendedor` | Emitir una venta tras vencer el token JWT. | Petición devuelve 401; interceptor redirige a login recordando la URL de venta. | Transacción rechazada antes de afectar la base de datos; retorno seguro garantizado. | **PASA** | `P-I01_401post.png` |
| **P-G01** | Guards (Propio) | Protección de pantalla de login para autenticados | `admin` | Con sesión abierta, escribir en el navegador `/login`. | `invitadoGuard` bloquea el acceso y redirige de inmediato a `/inicio`. | Evita doble inicio de sesión y mantiene al usuario dentro del espacio autenticado. | **PASA** | `P-G01_invitado.png` |
| **B-01** | Aviso previo | Detección y despliegue a los 120 segundos | `vendedor` | Esperar o simular que resten exactamente 2 minutos para el vencimiento. | Se despliega banner sticky superior de advertencia sobre el contenido. | Signal `segundosRestantes <= 120` activa `porVencer()` y muestra `AvisoSesion`. | **PASA** | `B-01_aviso.png` |
| **B-02** | Aviso previo | Actualización segundo a segundo en `mm:ss` | `vendedor` | Observar el avance del conteo en el aviso de sesión. | Cuenta regresiva avanza fluidamente (ej. 01:59, 01:58, 01:57) en `mm:ss`. | `setInterval(1000)` actualiza el signal reactivo sin requerir ciclos de zona sucios. | **PASA** | `B-02_cuenta.png` |
| **B-03** | Aviso previo | Descarte temporal del aviso mediante «×» | `vendedor` | Hacer clic en el botón [ × ] del aviso de expiración. | El aviso se oculta de la pantalla hasta que inicie una nueva sesión. | Método `ocultarAviso()` actualiza `avisoOculto = true` desactivando el `computed`. | **PASA** | `B-03_descarte.png` |
| **B-04** | Aviso previo | Expiración total y redirección al alcanzar 00:00 | `vendedor` | Permitir que el cronómetro llegue a 00:00 sin interacción. | La sesión se cierra sola, se limpian recursos y redirige a login con aviso. | `cerrarSesion('expirada', url)` destruye el temporizador y navega a `/login?expirada=1`. | **PASA** | `B-04_cero.png` |

---

## 2. Fichas de Evidencias Individuales con Espacio para Capturas

A continuación se presentan las fichas detalladas para cada caso de prueba, preparadas con el espacio designado para adjuntar la captura correspondiente:

```
========================================================================================
CASO DE PRUEBA L-01: Validación de Formulario de Login Vacío y Parcial
========================================================================================
Grupo:               Login
Usuario:             Anónimo
Precondición:        Página de login cargada sin datos en el formulario.
Pasos Ejecutados:    1. Clic en botón «Ingresar» con campos de usuario y contraseña vacíos.
                     2. Ingresar únicamente el usuario «admin» y presionar «Ingresar».
Resultado Esperado:  Mensajes «Ingrese su usuario» e «Ingrese su contraseña» en rojo; ninguna petición HTTP emitida a la red.
Resultado Obtenido:  Validadores reactivos marcan controles como invalid/touched; pestaña Network permanece sin peticiones.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: L-01_red.png]                                 |
|                                                                                      |
|  * Formulario con advertencias en rojo y pestaña Red (Network) vacía sin peticiones *|
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA L-02: Respuesta Uniforme ante Credenciales Erróneas y Cuenta Inactiva
========================================================================================
Grupo:               Login
Usuarios Probados:   1. no_existe / Clave123*  2. admin / ClaveErronea*  3. inactivo / Inactivo2026*
Precondición:        Conexión establecida con PharmaBackend en puerto 8080.
Pasos Ejecutados:    1. Intentar acceder con usuario no registrado en base de datos.
                     2. Intentar acceder con admin y contraseña incorrecta.
                     3. Intentar acceder con cuenta suspendida (estado = false).
Resultado Esperado:  Mismo mensaje de error idéntico en los tres escenarios; la contraseña se borra y el nombre de usuario se preserva.
Resultado Obtenido:  Se despliega la alerta «Usuario o contraseña incorrectos», campo password se resetea y username permanece intacto.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: L-02_login.png]                               |
|                                                                                      |
|  * Alerta de error idéntica en los tres intentos protegiendo enumeración de cuentas *|
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA L-03: Prevención de Múltiples Peticiones por Doble Clic
========================================================================================
Grupo:               Login
Usuario:             admin / Admin2026*
Precondición:        Formulario completado con credenciales válidas.
Pasos Ejecutados:    1. Realizar doble clic veloz y consecutivo sobre el botón «Ingresar».
                     2. Inspeccionar el registro de peticiones en la pestaña Red de DevTools.
Resultado Esperado:  El botón se deshabilita de inmediato al primer clic; se emite exactamente una sola petición POST /auth/login.
Resultado Obtenido:  Signal `enviando = true` desactiva el botón y muestra «Ingresando…»; en Red se registra solo un POST HTTP 200.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: L-03_red.png]                                 |
|                                                                                      |
|  * Pestaña Red con una sola petición POST /api/v1/auth/login y botón deshabilitado * |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA L-04: Mitigación de Redirección Abierta (Open Redirect)
========================================================================================
Grupo:               Login
Usuario:             vendedor / Vendedor2026*
Precondición:        Cargar URL manipulada con host malicioso externo.
Pasos Ejecutados:    1. Escribir en la barra de direcciones:
                        http://localhost:4200/login?returnUrl=https://sitio-falso.com
                     2. Ingresar las credenciales legítimas del usuario vendedor.
                     3. Hacer clic en «Ingresar».
Resultado Esperado:  La aplicación navega a /inicio; bajo ninguna circunstancia se redirige hacia el dominio externo.
Resultado Obtenido:  El método privado `destino()` filtra URLs absolutas y con prefijo '//', reasignando la navegación segura a /inicio.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: L-04_url.png]                                 |
|                                                                                      |
|  * Barra de direcciones con returnUrl externo y posterior aterrizaje en /inicio *   |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA S-01: Persistencia de Sesión con F5 vs Pérdida al Cerrar Navegador
========================================================================================
Grupo:               Sesión
Usuario:             vendedor / Vendedor2026*
Precondición:        Sesión iniciada exitosamente.
Pasos Ejecutados:    1. Navegar al módulo /productos y pulsar F5 en el teclado.
                     2. Verificar si se mantiene autenticado y en la misma ruta.
                     3. Cerrar por completo la ventana del navegador, reabrir y escribir http://localhost:4200/productos.
Resultado Esperado:  Tras pulsar F5 la sesión permanece inalterada; tras cerrar el navegador la sesión se elimina y solicita login.
Resultado Obtenido:  `sessionStorage` preserva el token durante la recarga de la pestaña, pero se destruye al cerrar la instancia del navegador.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: S-01_sesion.png]                              |
|                                                                                      |
|  * Sesión mantenida tras F5 y clave pharmasoft.sesion en Almacenamiento de sesión *  |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA S-02: Descarte Automático de Sesión con Timestamp Pasado
========================================================================================
Grupo:               Sesión
Usuario:             vendedor / Vendedor2026*
Precondición:        Sesión iniciada en el navegador.
Pasos Ejecutados:    1. Abrir DevTools -> Aplicación -> Almacenamiento de sesión -> pharmasoft.sesion.
                     2. Editar la propiedad "expiraEn" colocándole un timestamp del pasado (ej. 1000).
                     3. Presionar F5 para recargar la SPA.
Resultado Esperado:  La sesión guardada se descarta de inmediato y la SPA transfiere la pantalla al login.
Resultado Obtenido:  `leerSesionGuardada()` evalúa `Date.now() >= sesion.expiraEn`, borra la clave corrupta y redirige al login.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: S-02_expira.png]                              |
|                                                                                      |
|  * Clave pharmasoft.sesion descartada en sessionStorage y formulario de login visible*|
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA S-03: Resiliencia ante Corrupción de Datos en sessionStorage
========================================================================================
Grupo:               Sesión
Usuario:             Anónimo
Precondición:        Navegador con clave pharmasoft.sesion presente.
Pasos Ejecutados:    1. En DevTools -> Aplicación, modificar el valor de pharmasoft.sesion por un texto corrupto (ej. "error_texto_invalido").
                     2. Presionar F5 para forzar la lectura del almacenamiento.
Resultado Esperado:  La SPA no colapsa ni muestra pantalla en blanco; captura la falla con try/catch y muestra el login.
Resultado Obtenido:  El bloque `try/catch` de `leerSesionGuardada()` atrapa el error de parseo, elimina el registro dañado y retorna null.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: S-03_storage.png]                             |
|                                                                                      |
|  * Valor corrupto capturado limpiamente sin excepciones no controladas en Consola *  |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA S-04: Concurrencia de Sesión en Múltiples Pestañas
========================================================================================
Grupo:               Sesión
Usuario:             almacen / Almacen2026*
Precondición:        Mismo navegador con dos pestañas abiertas en la SPA.
Pasos Ejecutados:    1. Pestaña A: Iniciar sesión y navegar a /productos.
                     2. Pestaña B: Abrir la misma URL y confirmar sesión activa.
                     3. Pestaña A: Hacer clic en «Cerrar sesión».
                     4. Pestaña B: Intentar navegar a /categorias.
Resultado Esperado:  Registrar el comportamiento de aislamiento de pestañas de sessionStorage y documentar la consecuencia técnica.
Resultado Obtenido:  En Pestaña B la sesión permanece temporalmente activa porque `sessionStorage` es independiente por contexto de pestaña.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: S-04_pestanas.png]                            |
|                                                                                      |
|  * Dos pestañas lado a lado: Pestaña A en login y Pestaña B navegando productos *   |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA I-01: Inyección Selectiva de Cabecera Authorization: Bearer
========================================================================================
Grupo:               Interceptor
Usuario:             admin / Admin2026*
Precondición:        Sesión iniciada con token válido en sessionStorage.
Pasos Ejecutados:    1. Abrir DevTools -> pestaña Red (Network) y filtrar por Fetch/XHR.
                     2. Navegar a /productos (emite GET /api/v1/productos).
                     3. Observar la petición previa POST /api/v1/auth/login.
                     4. Generar petición externa (ej. fuentes de Google o CDN de imagen).
Resultado Esperado:  Solo las peticiones a la API llevan la cabecera Authorization: Bearer. El login y peticiones externas no la incluyen.
Resultado Obtenido:  `authInterceptor` valida `req.url.startsWith(environment.apiUrl)` antes de inyectar el token Bearer.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: I-01_red.png]                                 |
|                                                                                      |
|  * Cabeceras de petición con Authorization: Bearer [TOKEN OFUSCADO eyJ...] *         |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA I-02: Comportamiento ante Caída del Servidor Backend
========================================================================================
Grupo:               Interceptor
Usuario:             vendedor / Vendedor2026*
Precondición:        Sesión iniciada en la SPA.
Pasos Ejecutados:    1. Detener el proceso de PharmaBackend en la terminal.
                     2. Desde la SPA, hacer clic en el menú «Productos».
                     3. Observar la reacción de la interfaz y el estado de la sesión.
Resultado Esperado:  Mensaje de error de comunicación o fallo de conexión; la sesión no se cierra (no se confunde con error 401).
Resultado Obtenido:  Se captura el error de red (status 0); la SPA notifica la indisponibilidad sin eliminar la sesión del almacenamiento.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: I-02_error.png]                               |
|                                                                                      |
|  * Error de conexión en la vista y sesión del usuario preservada en el header *      |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA I-03: Detección y Manejo de Token Adulterado (HTTP 401)
========================================================================================
Grupo:               Interceptor
Usuario:             vendedor / Vendedor2026*
Precondición:        Sesión activa con token JWT almacenado.
Pasos Ejecutados:    1. En DevTools -> sessionStorage -> pharmasoft.sesion, alterar un carácter del token JWT (ej. modificar una letra).
                     2. Navegar al módulo de «Ventas» (/ventas).
                     3. Observar la respuesta del servidor en Red y la reacción de la SPA.
Resultado Esperado:  El backend responde HTTP 401; la SPA expulsa al usuario al login con aviso «Su sesión expiró» y returnUrl=%2Fventas.
Resultado Obtenido:  `errorInterceptor` atrapa el 401, invoca `cerrarSesion('expirada', '/ventas')` y navega a `/login?expirada=1&returnUrl=%2Fventas`.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: I-03_red.png]                                 |
|                                                                                      |
|  * Pestaña Red con respuesta 401 de /api/v1/ventas y pantalla de login con aviso *   |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA G-01: Protección de Rutas sin Sesión mediante authGuard
========================================================================================
Grupo:               Guards
Usuario:             Anónimo
Precondición:        Navegador limpio sin token de autenticación.
Pasos Ejecutados:    1. Escribir manualmente en la URL: http://localhost:4200/productos/1/editar
                     2. Escribir: http://localhost:4200/ventas/nueva
                     3. Escribir: http://localhost:4200/inicio
Resultado Esperado:  En los tres casos el guard intercepta la navegación y redirige al login con el returnUrl correspondiente codificado.
Resultado Obtenido:  `authGuard` deniega la navegación y envía al usuario a `/login?returnUrl=...` preservando el destino deseado.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: G-01_guard.png]                               |
|                                                                                      |
|  * Barra de direcciones del navegador mostrando /login?returnUrl=%2Fventas%2Fnueva * |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA G-02: Control de Autorización por Permisos mediante permisoGuard
========================================================================================
Grupo:               Guards
Usuarios:            1. vendedor (sin permiso CATALOGO_ESCRIBIR)  2. almacen (sin permiso VENTAS_LEER)
Precondición:        Usuarios autenticados con sus respectivos roles y permisos.
Pasos Ejecutados:    1. Con vendedor escribir en la barra de direcciones: /categorias/nuevo y /productos/1/editar.
                     2. Con almacenero escribir en la barra de direcciones: /ventas/nueva.
Resultado Esperado:  Redirección a la vista «403 · Acceso denegado» en los tres intentos.
Resultado Obtenido:  `permisoGuard` valida los permisos requeridos en la metadata de la ruta (`data.permiso`); al no tenerlos, navega a `/acceso-denegado`.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: G-02_403.png]                                 |
|                                                                                      |
|  * Pantalla de «403 · Acceso denegado» con mensaje explicativo para el usuario *     |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA M-01: Adaptación Reactiva de Menús y Botones por Privilegios
========================================================================================
Grupo:               Menú y Acciones
Usuarios:            admin, vendedor, almacen, supervisor
Precondición:        Cuentas configuradas con diferentes combinaciones de permisos.
Pasos Ejecutados:    1. Iniciar sesión con cada usuario y revisar el menú lateral.
                     2. Abrir la página de /productos y verificar la presencia de botones de acción.
Resultado Esperado:  Cada usuario visualiza únicamente lo permitido:
                     - admin: Menú completo, botones Nuevo, Editar y Dar de baja.
                     - vendedor: Menú con Ventas y Catálogo, pero Productos sin botones de modificación.
                     - almacen: Menú con Catálogo y botones de modificación; módulo Ventas oculto.
                     - supervisor: Menú y botones de Catálogo y Ventas disponibles simultáneamente.
Resultado Obtenido:  El menú lateral computado y la directiva estructural `*appSiPermiso` destruyen o renderizan los nodos según la sesión.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: M-01_menu.png]                                |
|                                                                                      |
|  * Comparativa de menú lateral y tabla de productos para vendedor vs almacen *      |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA M-02: Transición de Menú en Caliente sin Recarga de Página
========================================================================================
Grupo:               Menú y Acciones
Usuarios:            admin -> almacen
Precondición:        Sesión iniciada como usuario administrador.
Pasos Ejecutados:    1. Estando en la SPA como admin, hacer clic en «Cerrar sesión».
                     2. Sin presionar F5 ni recargar, ingresar credenciales de «almacen».
                     3. Observar la actualización del menú lateral de navegación.
Resultado Esperado:  El menú se transforma de inmediato sin necesidad de recargar la página en el navegador.
Resultado Obtenido:  El signal `sesionActual` emite el nuevo objeto de sesión y el `computed()` del Sidebar reacciona al instante.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: M-02_computed.png]                            |
|                                                                                      |
|  * Transición fluida a perfil de almacenero con menú recalculado reactivamente *    |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA E-01: Defensa en Profundidad ante Evasión de UI (HTTP 403)
========================================================================================
Grupo:               401 / 403
Usuario:             vendedor / Vendedor2026*
Precondición:        Usuario sin el permiso CATALOGO_ESCRIBIR en sesión.
Pasos Ejecutados:    1. Iniciar sesión como vendedor y abrir /productos.
                     2. Abrir DevTools -> Elementos y forzar la aparición del botón «Dar de baja» (o ejecutar `fetch` de DELETE desde Consola).
                     3. Enviar la petición DELETE /api/v1/productos/1 al servidor.
Resultado Esperado:  El backend rechaza la operación con HTTP 403 Forbidden; la SPA despliega el mensaje de error y la sesión continúa.
Resultado Obtenido:  Spring Security intercepta la petición por `@PreAuthorize`, devuelve 403 y `errorInterceptor` no cierra la sesión.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: E-01_consola.png]                             |
|                                                                                      |
|  * Petición DELETE rechazada con 403 en Consola/Red y sesión activa inalterada *     |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA P-L01: Resistencia a Ataques de Inyección en Formulario de Login
========================================================================================
Grupo:               Login (Caso Propio)
Usuario:             Malicioso / Atacante
Precondición:        Formulario de login en pantalla.
Pasos Ejecutados:    1. Ingresar en el campo de usuario: `' OR '1'='1`
                     2. Ingresar en el campo de contraseña: `<script>alert(1)</script>`
                     3. Presionar «Ingresar».
Resultado Esperado:  La SPA no colapsa, los datos se envían sanitizados como strings JSON y el backend responde 401 sin exponer trazas de SQL.
Resultado Obtenido:  El servicio devuelve 401 genérico de autenticación sin fugas de información ni anomalías de ejecución en el servidor.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: P-L01_sqli.png]                               |
|                                                                                      |
|  * Manejo seguro de caracteres maliciosos con respuesta 401 limpia del backend *     |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA P-S01: Inviolabilidad Criptográfica de la Sesión en Cliente
========================================================================================
Grupo:               Sesión (Caso Propio)
Usuario:             vendedor / Vendedor2026*
Precondición:        Sesión activa como vendedor con permisos restringidos.
Pasos Ejecutados:    1. En DevTools -> sessionStorage -> pharmasoft.sesion, modificar manualmente el array de roles agregando "ADMIN".
                     2. Observar la interfaz: la SPA renderiza los botones administrativos por lectura de memoria local.
                     3. Clic en «Nuevo producto» o intentar registrar una categoría con la sesión manipulada.
Resultado Esperado:  El backend valida la firma criptográfica HMAC-SHA384 del JWT y deniega la acción con HTTP 403; la escalada local es estéril.
Resultado Obtenido:  La firma criptográfica del token no puede ser falsificada en el cliente; el servidor desestima los privilegios adulterados.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: P-S01_tamper.png]                             |
|                                                                                      |
|  * Rechazo 403 en Red ante petición realizada con payload de sesión manipulado *     |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA P-I01: Expiración de Token en Peticiones POST de Registro
========================================================================================
Grupo:               Interceptor (Caso Propio)
Usuario:             vendedor / Vendedor2026*
Precondición:        Formulario de nueva venta diligenciado justo al expirar el token.
Pasos Ejecutados:    1. Preparar una venta en /ventas/nueva.
                     2. Esperar el agotamiento del tiempo del token JWT.
                     3. Hacer clic en «Registrar venta».
Resultado Esperado:  El backend devuelve 401; el interceptor captura la respuesta, resguarda la ruta en returnUrl y transfiere a login con aviso.
Resultado Obtenido:  No se producen registros huérfanos ni errores no controlados; la venta no autorizada se bloquea limpiamente.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: P-I01_401post.png]                            |
|                                                                                      |
|  * Petición POST abortada con 401 y redirección a login con queryParams de retorno * |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA P-G01: Bloqueo de Acceso a Login para Usuarios Autenticados
========================================================================================
Grupo:               Guards (Caso Propio)
Usuario:             admin / Admin2026*
Precondición:        Sesión activa en el sistema.
Pasos Ejecutados:    1. Estando autenticado en el sistema, escribir en el navegador: http://localhost:4200/login
                     2. Presionar Enter.
Resultado Esperado:  El `invitadoGuard` bloquea el acceso a la pantalla de login y redirige de inmediato a `/inicio`.
Resultado Obtenido:  La aplicación no permite reinstanciar el login si ya existe sesión; previene inconsistencias de estado en la UI.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: P-G01_invitado.png]                           |
|                                                                                      |
|  * Intento de navegación a /login redirigido automáticamente a la vista de /inicio * |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA B-01: Aparición Automática del Aviso Previo a los 120 Segundos
========================================================================================
Grupo:               Aviso Previo de Expiración
Usuario:             vendedor / Vendedor2026*
Precondición:        Sesión activa con expiración programada (ej. token de 3 minutos).
Pasos Ejecutados:    1. Monitorear el tiempo restante en la consola o esperar que falten 2 minutos (120 segundos).
                     2. Observar la parte superior de la página en la vista de contenido.
Resultado Esperado:  Aparece el componente banner flotante `AvisoSesion` con fondo de advertencia amarillo y cuenta regresiva.
Resultado Obtenido:  Signal `segundosRestantes <= 120` activa reactivamente `porVencer()`, renderizando el banner con role="status".
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: B-01_aviso.png]                               |
|                                                                                      |
|  * Banner de advertencia «Su sesión vence en 01:59» visible sobre el contenido *     |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA B-02: Avance Dinámico del Cronómetro en Formato mm:ss
========================================================================================
Grupo:               Aviso Previo de Expiración
Usuario:             vendedor / Vendedor2026*
Precondición:        Banner de advertencia desplegado en pantalla.
Pasos Ejecutados:    1. Observar fijamente el cronómetro durante varios segundos continuos.
                     2. Constatar el formato de presentación de minutos y segundos.
Resultado Esperado:  El contador decrementa segundo a segundo (01:58, 01:57, 01:56...) formateado con dos dígitos en cada campo.
Resultado Obtenido:  El `setInterval(1000)` sincroniza el signal y el `computed()` formatea con `padStart(2, '0')` sin fallas.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: B-02_cuenta.png]                              |
|                                                                                      |
|  * Detalle del banner con temporizador en formato mm:ss (ej. 01:45) *                |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA B-03: Ocultamiento Temporal del Aviso Mediante Botón de Cierre [ × ]
========================================================================================
Grupo:               Aviso Previo de Expiración
Usuario:             vendedor / Vendedor2026*
Precondición:        Banner de advertencia activo en pantalla.
Pasos Ejecutados:    1. Hacer clic en el botón [ × ] ubicado en el extremo derecho del banner.
                     2. Navegar entre distintas opciones del menú (ej. /categorias, /productos).
Resultado Esperado:  El banner desaparece de la vista y no vuelve a mostrarse durante la sesión actual.
Resultado Obtenido:  `auth.ocultarAviso()` actualiza el signal `avisoOculto = true`, el cual silencia el aviso hasta el próximo login.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: B-03_descarte.png]                            |
|                                                                                      |
|  * Pantalla despejada tras pulsar [ × ], con el temporizador interno aún activo *    |
+--------------------------------------------------------------------------------------+
```

---

```
========================================================================================
CASO DE PRUEBA B-04: Cierre Automático y Retorno a Login al Agotar el Tiempo (00:00)
========================================================================================
Grupo:               Aviso Previo de Expiración
Usuario:             vendedor / Vendedor2026*
Precondición:        Aviso activo en cuenta regresiva final.
Pasos Ejecutados:    1. Permanecer en la página hasta que el cronómetro llegue a 00:00 sin interacción.
                     2. Verificar el destino final de la SPA y el estado del almacenamiento.
Resultado Esperado:  La sesión finaliza sola; el temporizador se destruye (clearInterval) y la SPA navega a /login con aviso de expiración.
Resultado Obtenido:  Al llegar a 0, `AuthService` invoca `cerrarSesion('expirada', url)` limpiando `pharmasoft.sesion` y navegando a login.
Estado:              [X] PASA   [ ] FALLA

+--------------------------------------------------------------------------------------+
|                                                                                      |
|       [PEGAR AQUÍ CAPTURA DE PANTALLA: B-04_cero.png]                                |
|                                                                                      |
|  * Pantalla de login con mensaje «Su sesión expiró. Inicie sesión nuevamente» *      |
+--------------------------------------------------------------------------------------+
```
