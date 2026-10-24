# Informe y Matriz de Pruebas: Seguridad Frontend en PharmaSoft

**Universidad Peruana Unión (UPeU)**  
**Facultad de Ingeniería y Arquitectura · EP Ingeniería de Sistemas**  
**Asignatura:** Lenguaje de Programación II · Ciclo IV · Semestre 2026-2  
**Unidad II:** Frontend SPA empresarial seguro  
**Sesión 11:** Seguridad frontend: login, sesión, interceptores, guards, menú por permisos y manejo de 401/403 (Reto 01)  
**Estudiante:** Samuel Vilca  
**Docente:** Reyna Barreto Benjamin David  
**Fecha:** 22 de octubre de 2026  

---

## 1. Información General y Metadatos de la Entrega

* **Título:** Informe de verificación práctica y matriz de evidencias de seguridad frontend en la SPA PharmaSoft.
* **Objetivo de la Sesión:** Integrar la SPA PharmaSoft con el backend seguro mediante un login reactivo que almacena la sesión con expiración en `sessionStorage`, interceptores funcionales HTTP que inyectan el token `Bearer` y gestionan automáticamente las respuestas 401, guards de enrutamiento por autenticación y permisos, un menú lateral computado por privilegios y botones protegidos con la directiva estructural `*appSiPermiso`.
* **Repositorio Frontend:** `pharma-frontend` (Angular 22 standalone, TypeScript 5, Angular Signals).
* **Repositorio Backend:** `PharmaBackend` (Spring Boot, Spring Security, JWT HMAC-SHA HS384).
* **Rama de Trabajo:** `feature/seguridad-frontend-vilca` (creada a partir de `develop`).
* **Historial de Commits Convencionales Ejecutados:**
  1. `feat(auth): AuthService con sesión en sessionStorage y expiración`
  2. `feat(auth): interceptores de token y de errores 401`
  3. `feat(auth): login, guards y rutas protegidas`
  4. `feat(auth): menú y acciones según permisos`

---

## 2. Preparación del Entorno y Cuentas de Prueba

Para la ejecución sistemática de las pruebas, se desplegó `PharmaBackend` en el puerto `8080` y la SPA `pharma-frontend` en el puerto `4200` (`http://localhost:4200`), utilizando las cuentas de usuario provistas en la sesión:

| Usuario | Contraseña | Roles | Permisos Asignados en Backend | Visibilidad y Accesos en la SPA |
| :--- | :--- | :--- | :--- | :--- |
| **admin** | `Admin2026*` | `ADMIN` | Acceso total a todos los módulos | Inicio, Categorías, Productos (con edición/baja), Ventas. |
| **vendedor** | `Vendedor2026*` | `VENDEDOR` | `CATALOGO_LEER`, `CLIENTES_LEER`, `CLIENTES_ESCRIBIR`, `VENTAS_LEER`, `VENTAS_REGISTRAR` | Inicio, Categorías, Productos (solo lectura, sin botones de acción), Ventas. |
| **almacen** | `Almacen2026*` | `ALMACENERO` | `CATALOGO_LEER`, `CATALOGO_ESCRIBIR` | Inicio, Categorías, Productos (con botones Nuevo, Editar, Dar de baja). Módulo Ventas oculto. |
| **supervisor** | `Supervisor2026*` | `VENDEDOR` + `ALMACENERO` | Unión de permisos de ambos roles sin duplicados | Acceso a todos los módulos con facultades de edición del catálogo y registro de ventas. |
| **inactivo** | `Inactivo2026*` | `VENDEDOR` *(deshabilitado)* | Cuenta con `estado = false` | Acceso denegado en login (HTTP 401). |

---

## 3. Matriz Consolidada de Pruebas (Paso 11)

A continuación se resume la ejecución de los 16 casos de verificación estipulados en la guía académica:

| N.º | Acción Ejecutada | Resultado Esperado (Guía) | Resultado Obtenido en la SPA | Estado |
| :---: | :--- | :--- | :--- | :---: |
| **01** | Sin sesión, escribir `http://localhost:4200/ventas` | Redirige al login con `?returnUrl=%2Fventas` | `authGuard` intercepta la navegación y redirige a `/login?returnUrl=%2Fventas`. | **PASA** |
| **02** | Pulsar «Ingresar» con formulario vacío | Mensajes de error en ambos campos; ninguna petición HTTP | Se activan los validadores requeridos en `username` y `password`, sin enviar tráfico de red. | **PASA** |
| **03** | Login `admin` con contraseña incorrecta | Muestra «Usuario o contraseña incorrectos» (HTTP 401); permanece en login | El formulario captura el error 401 del backend y despliega alerta visual sin redirigir. | **PASA** |
| **04** | Login `inactivo` / `Inactivo2026*` | Mismo mensaje de error; no revela la existencia de la cuenta | Se muestra «Usuario o contraseña incorrectos» protegiendo la enumeración de usuarios. | **PASA** |
| **05** | Login `vendedor` / `Vendedor2026*` | Retorna a `/ventas`; encabezado muestra nombre, rol y expiración | Login exitoso, redirección fluida a `/ventas`, header refleja datos de sesión y hora de término. | **PASA** |
| **06** | Inspección en Red de `GET /productos` | Petición incluye cabecera `Authorization: Bearer eyJ...` | `authInterceptor` añade el token Bearer automáticamente en todas las peticiones a la API. | **PASA** |
| **07** | Revisar Almacenamiento de sesión | Clave `pharmasoft.sesion` con token, `expiraEn` y permisos | Objeto JSON persistido en `sessionStorage` con estructura completa de `Sesion`. | **PASA** |
| **08** | Pulsar F5 en módulo Productos | Sesión se mantiene intacta en la misma página | `AuthService` recupera la sesión desde `sessionStorage` y preserva la navegación. | **PASA** |
| **09** | Usuario `vendedor` en Productos | Sin botón «+ Nuevo producto» ni columna «Acciones» | Directiva `*appSiPermiso` destruye los nodos del DOM por falta de `CATALOGO_ESCRIBIR`. | **PASA** |
| **10** | `vendedor` escribe `/productos/nuevo` | Redirección inmediata a «403 · Acceso denegado» | `permisoGuard` valida la ruta y redirige a la vista `/acceso-denegado`. | **PASA** |
| **11** | Con sesión activa, escribir `/login` | Redirige a `/inicio` mediante `invitadoGuard` | `invitadoGuard` bloquea el acceso a la pantalla de login y transfiere a `/inicio`. | **PASA** |
| **12** | Pulsar botón «Cerrar sesión» | Regresa al login y elimina `pharmasoft.sesion` | Cierre voluntario: borrado de `sessionStorage`, timer cancelado y redirección limpia a `/login`. | **PASA** |
| **13** | Login `almacen`; escribir `/ventas` | Ventas ausente en el menú lateral y URL directa muestra 403 | Menú filtrado por `computed()`; acceso directo a `/ventas` bloqueado por `permisoGuard`. | **PASA** |
| **14** | Login `supervisor` | Acceso visible a Ventas y botones de edición de catálogo | Fusión de permisos efectiva: acceso simultáneo a módulos de venta y catálogo administrativo. | **PASA** |
| **15** | Alterar un carácter del token en sesión y F5 | Backend responde 401; SPA vuelve a login con «Su sesión expiró» | `errorInterceptor` captura el 401 y expulsa al usuario al login con aviso de expiración. | **PASA** |
| **16** | Backend con expiración a 1 min; esperar | Al cumplirse el minuto, la SPA cierra sesión automáticamente | El temporizador interno de `AuthService` invoca `cerrarSesion('expirada', url)` con aviso y retorno. | **PASA** |

---

## 4. Evidencias Individuales de Pruebas (Paso 11)

A continuación se presentan las fichas individuales de cada prueba ejecutada con el espacio asignado para la respectiva captura de pantalla:

```
========================================================================================
CASO DE PRUEBA 01: Protección de Ruta sin Sesión y Parámetro returnUrl
========================================================================================
Acción:          Sin sesión iniciada, escribir en el navegador: http://localhost:4200/ventas
Precondición:    sessionStorage limpio (sin clave pharmasoft.sesion).
Resultado Esperado: Redirección automática a /login?returnUrl=%2Fventas.
Resultado Obtenido: authGuard detecta falta de autenticación y transfiere la navegación a /login recordando la URL original.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 01]
(Captura de la barra de direcciones del navegador mostrando la URL de login con queryParam)
```

---

```
========================================================================================
CASO DE PRUEBA 02: Validación de Formulario de Login en Cliente
========================================================================================
Acción:          Hacer clic en el botón «Ingresar» manteniendo los campos vacíos.
Precondición:    Formulario de login limpio sin interacción previa.
Resultado Esperado: Mensajes «Ingrese su usuario» e «Ingrese su contraseña»; ninguna petición HTTP emitida.
Resultado Obtenido: Formulario marca controles como touched y renderiza mensajes de error reactivos. En pestaña Red no existe tráfico.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 02]
(Captura del formulario con mensajes de error en rojo y pestaña Network vacía)
```

---

```
========================================================================================
CASO DE PRUEBA 03: Manejo de Credenciales Inválidas (HTTP 401)
========================================================================================
Acción:          Ingresar usuario «admin» con contraseña incorrecta (ej. «clave123»).
Precondición:    Usuario registrado en base de datos.
Resultado Esperado: Alerta visual «Usuario o contraseña incorrectos» (HTTP 401); permanece en la pantalla de login.
Resultado Obtenido: errorInterceptor excluye /auth/login de la redirección forzada y el componente Login despliega la alerta.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 03]
(Captura del mensaje de error en la tarjeta de login y status 401 en consola/red)
```

---

```
========================================================================================
CASO DE PRUEBA 04: Autenticación de Usuario Inactivo
========================================================================================
Acción:          Ingresar credenciales del usuario inactivo («inactivo» / «Inactivo2026*»).
Precondición:    Usuario registrado en el backend con estado = false.
Resultado Esperado: Mismo mensaje «Usuario o contraseña incorrectos» (sin revelar si la cuenta existe o está suspendida).
Resultado Obtenido: El backend responde 401 genérico y la SPA protege la información de enumeración de cuentas.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 04]
(Captura de la alerta genérica de credenciales incorrectas en el login)
```

---

```
========================================================================================
CASO DE PRUEBA 05: Inicio de Sesión Exitoso y Redirección Segura (returnUrl)
========================================================================================
Acción:          Ingresar con credenciales de vendedor («vendedor» / «Vendedor2026*»).
Precondición:    Login originado con returnUrl=/ventas.
Resultado Esperado: Redirección automática a /ventas; encabezado muestra «Lucia Ramos Cutipa», rol «VENDEDOR» y hora de expiración.
Resultado Obtenido: Retorno exitoso a la ruta original; layout renderiza la identidad del operador y la hora límite de sesión.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 05]
(Captura de la pantalla de Ventas con el encabezado superior mostrando usuario, rol y hora de expiración)
```

---

```
========================================================================================
CASO DE PRUEBA 06: Inyección de Token JWT Bearer por Interceptor HTTP
========================================================================================
Acción:          Navegar a Productos y verificar en la pestaña Red (F12) la petición GET /api/v1/productos.
Precondición:    Sesión activa con token JWT vigente.
Resultado Esperado: Cabecera de solicitud con formato «Authorization: Bearer eyJhbGciOi...». Petición /auth/login sin token.
Resultado Obtenido: authInterceptor intercepta peticiones a la API e incrusta el encabezado Authorization de manera transparente.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 06]
(Captura de la pestaña Red de las DevTools con la cabecera Authorization: Bearer seleccionada)
```

---

```
========================================================================================
CASO DE PRUEBA 07: Verificación de Persistencia en sessionStorage
========================================================================================
Acción:          Abrir DevTools → pestaña Aplicación → Almacenamiento de sesión (sessionStorage) → http://localhost:4200.
Precondición:    Sesión iniciada correctamente.
Resultado Esperado: Registro de la clave «pharmasoft.sesion» conteniendo token, expiraEn, nombreCompleto, roles y permisos.
Resultado Obtenido: Estructura JSON íntegra almacenada en sessionStorage cumpliendo las políticas de seguridad de la botica.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 07]
(Captura del panel de sessionStorage mostrando la clave pharmasoft.sesion y su valor JSON)
```

---

```
========================================================================================
CASO DE PRUEBA 08: Supervivencia de Sesión tras Recarga (F5)
========================================================================================
Acción:          Estando en el módulo de Productos, presionar la tecla F5 o recargar la página.
Precondición:    Sesión válida y vigente.
Resultado Esperado: La aplicación permanece autenticada en Productos sin redirigir al login; datos del header persisten.
Resultado Obtenido: AuthService reconstruye el estado a partir de leerSesionGuardada() y restablece el temporizador.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 08]
(Captura del módulo Productos cargado con normalidad inmediatamente después del refresco)
```

---

```
========================================================================================
CASO DE PRUEBA 09: Restricción Visual en Catálogo para Rol VENDEDOR
========================================================================================
Acción:          Acceder a Productos con sesión de usuario «vendedor».
Precondición:    Usuario autenticado con rol VENDEDOR (carece de CATALOGO_ESCRIBIR).
Resultado Esperado: La tabla no muestra la columna «Acciones» ni los botones «Editar»/«Dar de baja»; desaparece «+ Nuevo producto».
Resultado Obtenido: La directiva estructural *appSiPermiso elimina los elementos del DOM; tabla muestra solo datos de consulta.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 09]
(Captura de la tabla de Productos limpia sin columna Acciones ni botón Nuevo producto)
```

---

```
========================================================================================
CASO DE PRUEBA 10: Bloqueo de Ruta de Escritura Directa para Rol VENDEDOR
========================================================================================
Acción:          Con sesión de «vendedor», escribir manualmente en la barra de URL: http://localhost:4200/productos/nuevo.
Precondición:    Usuario carece del permiso CATALOGO_ESCRIBIR.
Resultado Esperado: Redirección inmediata a la vista «403 · Acceso denegado» con botón «Volver al inicio».
Resultado Obtenido: permisoGuard intercepta la ruta protegida y envía al usuario al componente AccesoDenegado.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 10]
(Captura de la tarjeta «403 · Acceso denegado» dentro del layout)
```

---

```
========================================================================================
CASO DE PRUEBA 11: Protección contra Regreso al Login (invitadoGuard)
========================================================================================
Acción:          Con cualquier sesión activa, escribir en el navegador: http://localhost:4200/login.
Precondición:    Usuario autenticado en la SPA.
Resultado Esperado: El navegador redirige automáticamente a /inicio sin abrir el login.
Resultado Obtenido: invitadoGuard evalúa auth.autenticado() y cancela la navegación hacia login devolviendo UrlTree a /inicio.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 11]
(Captura del navegador en la vista Inicio tras intentar navegar a /login)
```

---

```
========================================================================================
CASO DE PRUEBA 12: Cierre Voluntario de Sesión («Cerrar sesión»)
========================================================================================
Acción:          Hacer clic en el botón «Cerrar sesión» ubicado en el encabezado superior.
Precondición:    Sesión activa con usuario identificado.
Resultado Esperado: Redirección a /login; la clave «pharmasoft.sesion» se borra por completo de sessionStorage.
Resultado Obtenido: AuthService limpia el almacenamiento, detiene el temporizador y devuelve al usuario a la vista de login.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 12]
(Captura del login limpio y la tabla de sessionStorage vacía)
```

---

```
========================================================================================
CASO DE PRUEBA 13: Menú y Bloqueo de Rutas para Rol ALMACENERO
========================================================================================
Acción:          Iniciar sesión con «almacen» («Almacen2026*»); revisar el menú lateral e intentar ingresar a /ventas.
Precondición:    Usuario con rol ALMACENERO (sin permiso VENTAS_LEER).
Resultado Esperado: El menú no muestra la opción «Ventas». Al escribir /ventas se muestra la pantalla de «Acceso denegado».
Resultado Obtenido: Sidebar computa reactivamente la lista excluyendo Ventas; navegación forzada a /ventas bloqueada por permisoGuard.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 13]
(Captura de la pantalla con el menú lateral sin opción Ventas y la vista de Acceso denegado)
```

---

```
========================================================================================
CASO DE PRUEBA 14: Acceso Combinado por Múltiples Roles (SUPERVISOR)
========================================================================================
Acción:          Iniciar sesión con usuario «supervisor» («Supervisor2026*»).
Precondición:    Usuario asignado con roles VENDEDOR y ALMACENERO en la base de datos.
Resultado Esperado: Menú muestra todos los módulos (Inicio, Categorías, Productos, Ventas); catálogo con botones de edición habilitados.
Resultado Obtenido: Unión de permisos efectiva en AuthService; interfaz otorga acceso tanto a ventas como a gestión de inventario.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 14]
(Captura del menú completo y la tabla de productos mostrando botones Editar y Dar de baja)
```

---

```
========================================================================================
CASO DE PRUEBA 15: Reacción ante Token JWT Corrupto o Manipulado en Navegador
========================================================================================
Acción:          En DevTools → Aplicación → sessionStorage, editar un carácter del campo «token» y presionar F5 en Productos.
Precondición:    Petición enviada al backend con firma inválida.
Resultado Esperado: El backend responde HTTP 401; la SPA cierra sesión automáticamente y redirige a login con aviso «Su sesión expiró».
Resultado Obtenido: errorInterceptor detecta el 401 no-login, purga la sesión y carga /login?expirada=1 con la alerta de expiración.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 15]
(Captura del formulario de login con el aviso superior amarillo «Su sesión expiró. Inicie sesión nuevamente.»)
```

---

```
========================================================================================
CASO DE PRUEBA 16: Expiración Automática de Token por Temporizador (Timeout)
========================================================================================
Acción:          Configurar temporalmente app.jwt.expiracion-minutos=1 en el backend; iniciar sesión y esperar 60 segundos.
Precondición:    Sesión activa con expiración breve.
Resultado Esperado: Al cumplirse el minuto exacto, la SPA expulsa la sesión y muestra el login con el aviso de expiración y returnUrl.
Resultado Obtenido: El temporizador programarExpiracion() se dispara al vencimiento; al loguearse nuevamente regresa a la misma página.
Estado:          [X] PASA   [ ] NO PASA

[PEGAR AQUÍ CAPTURA DE PANTALLA - PRUEBA 16]
(Captura de la redirección automática al login tras cumplirse el tiempo de vida del token)
```

---

## 5. Lista de Cotejo de la Sesión 11 (Criterios Observables)

| N.º | Criterio Observable | Cumplimiento | Observaciones Técnicas |
| :---: | :--- | :---: | :--- |
| **1** | El login valida el formulario, muestra el 401 del backend y no revela qué dato falló. | **SÍ** | Validaciones reactivas previas al envío; 401 unificado con mensaje neutro. |
| **2** | AuthService guarda la sesión en un signal y en sessionStorage, con el instante de vencimiento. | **SÍ** | Signal `sesionActual` y persistencia con `expiraEn = Date.now() + expiraEnSegundos * 1000`. |
| **3** | La sesión sobrevive a un F5 y se descarta si venció; un temporizador la cierra al vencer. | **SÍ** | `leerSesionGuardada()` valida integridad y `programarExpiracion()` maneja el cierre. |
| **4** | authInterceptor agrega Authorization: Bearer solo a las peticiones dirigidas a la API. | **SÍ** | Clona la petición solo si la URL inicia con `environment.apiUrl`. |
| **5** | errorInterceptor cierra la sesión ante un 401 (salvo en el login) y no ante un 403. | **SÍ** | Excluye `/auth/login`; ante 403 deja la sesión intacta y propaga el error. |
| **6** | authGuard protege el layout y recuerda la página pedida en returnUrl; invitadoGuard protege el login. | **SÍ** | Rutas hijas bajo `canActivate` y `canActivateChild`; login fuera de layout. |
| **7** | permisoGuard usa el permiso declarado en data y lleva a «Acceso denegado». | **SÍ** | Consulta `tienePermiso(data['permiso'])` y transfiere a `/acceso-denegado` (403). |
| **8** | El login solo redirige a rutas internas (sin redirección abierta). | **SÍ** | Método `destino()` rechaza URLs que inicien con protocolo externo o `//`. |
| **9** | El menú y los botones se muestran según los permisos (computed y *appSiPermiso). | **SÍ** | Sidebar reactivo y directiva estructural que remueve nodos del DOM. |
| **10** | El encabezado muestra el usuario, sus roles y la expiración, y permite cerrar sesión. | **SÍ** | Header interactivo con `DatePipe`, hora de vencimiento y botón funcional `salir()`. |
| **11** | La rama tiene al menos cuatro commits según la convención y una solicitud de incorporación hacia develop. | **SÍ** | 4 commits semánticos estructurados en la rama `feature/seguridad-frontend-vilca`. |

---

## 6. Conclusiones

1. **Defensa en Profundidad:** La SPA PharmaSoft aplica el principio fundamental de que *"ocultar no es proteger"*. La interfaz de usuario adapta los menús, rutas y botones para garantizar una experiencia de usuario clara y sin fricciones, mientras que el backend `PharmaBackend` ejerce el control de acceso estricto respondiendo HTTP 403 cuando una solicitud no autorizada intenta vulnerar las capas de la aplicación.
2. **Ciclo de Vida Seguro del Token:** El uso de `sessionStorage` combinado con temporizadores en memoria protege las terminales compartidas de la botica al garantizar que la sesión no perdure de manera indefinida ni sobreviva al cierre del navegador, mitigando riesgos de secuestro de sesión (Session Hijacking).
3. **Manejo Desacoplado y Robusto:** La arquitectura con interceptores funcionales de Angular 22 permite que los servicios de negocio (`ProductoService`, `CategoriaService`, `VentaService`) permanezcan completamente desacoplados de la lógica de autenticación y manejo de errores 401, centralizando la seguridad en un único punto mantenible.
