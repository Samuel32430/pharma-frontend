# Informe Técnico: Arquitectura de la SPA PharmaSoft

**Universidad Peruana Unión (UPeU)**  
*Facultad de Ingeniería y Arquitectura · EP Ingeniería de Sistemas*  
**Curso:** Lenguaje de Programación II · Ciclo IV · Semestre 2026-2  
**Actividad Autónoma — Sesión 7:** Módulo Clientes e informe de arquitectura de la SPA PharmaSoft  

---

## Metadatos de la Entrega

- **Estudiante:** Samuel Vilca
- **Docente:** Reyna Barreto Benjamin David
- **Repositorio Git:** `pharma-frontend`
- **Rama de Trabajo:** `feature/clientes-vilca`
- **Solicitud de Incorporación (Pull Request):** Rama `feature/clientes-vilca` hacia `develop`
- **Backend Integrado:** PharmaBackend (Spring Boot 3 en `http://localhost:8080/api/v1`)
- **Fecha:** Octubre 2026

---

## B1. Estructura del Proyecto

### Árbol de Carpetas (`src/app`)

El proyecto se encuentra organizado bajo una arquitectura modular limpia por dominios y capas de abstracción:

```text
src/app
│   app.config.ts
│   app.routes.ts
│   app.ts
│
├───core
│   ├───config
│   │       menu.ts
│   ├───models
│   │       error-response.ts
│   │       pagina-response.ts
│   └───utils
│           http-error.ts
│
├───features
│   ├───categorias
│   │   │   categorias.routes.ts
│   │   ├───models
│   │   │       categoria.model.ts
│   │   ├───pages
│   │   │   ├───categoria-form
│   │   │   │       categoria-form.css
│   │   │   │       categoria-form.html
│   │   │   │       categoria-form.ts
│   │   │   └───categoria-list
│   │   │           categoria-list.css
│   │   │           categoria-list.html
│   │   │           categoria-list.ts
│   │   └───services
│   │           categoria-service.ts
│   │
│   ├───clientes
│   │   │   clientes.routes.ts
│   │   ├───models
│   │   │       cliente.model.ts
│   │   ├───pages
│   │   │   ├───cliente-form
│   │   │   │       cliente-form.css
│   │   │   │       cliente-form.html
│   │   │   │       cliente-form.ts
│   │   │   └───cliente-list
│   │   │           cliente-list.css
│   │   │           cliente-list.html
│   │   │           cliente-list.ts
│   │   └───services
│   │           cliente-service.ts
│   │
│   └───inicio
│           inicio.html
│           inicio.ts
│
├───layout
│   ├───header
│   │       header.css
│   │       header.html
│   │       header.ts
│   ├───main-layout
│   │       main-layout.css
│   │       main-layout.html
│   │       main-layout.ts
│   └───sidebar
│           sidebar.css
│           sidebar.html
│           sidebar.ts
│
└───shared
    └───pages
        └───no-encontrado
                no-encontrado.ts
```

### Organización por Capas

- **`core/`**: Aloja las piezas singulares y transversales a toda la aplicación. Contiene configuraciones globales como el arreglo de navegación (`menu.ts`), modelos de datos genéricos como la envoltura paginada (`pagina-response.ts`) y la estructura de errores de la API (`error-response.ts`), además de utilidades reutilizables para el parseo de respuestas HTTP y mapeo de excepciones de Spring Boot (`http-error.ts`).
- **`layout/`**: Define la estructura visual persistente de la SPA mediante CSS Grid. Contiene el encabezado (`Header`), el menú lateral reactivo (`Sidebar`) y el contenedor principal (`MainLayout`), el cual aloja el `<router-outlet />` donde se proyectan las vistas secundarias sin recargar el marco exterior.
- **`features/`**: Agrupa los módulos funcionales del negocio de forma aislada e independiente (`inicio`, `categorias`, `clientes`). Cada módulo encapsula sus propios modelos, páginas, servicios y sub-rutas, permitiendo su desarrollo, mantenimiento y carga diferida (*lazy loading*) sin afectar a los demás.
- **`shared/`**: Contiene componentes, directivas o tuberías reutilizables por múltiples módulos que no pertenecen a un dominio de negocio específico, como la página de error 404 (`no-encontrado.ts`).

---

## B2. Mapa de Rutas de la Aplicación

La aplicación aplica división de código (*code splitting*) y carga diferida (*lazy loading*) mediante `loadChildren` y `loadComponent`, garantizando que cada módulo se descargue únicamente cuando el usuario accede a él:

| Ruta (URL) | Componente | ¿Ruta padre? | Tipo de carga | Título |
| :--- | :--- | :--- | :--- | :--- |
| `/inicio` | `Inicio` | `MainLayout` | `loadComponent` (diferida) | Inicio |
| `/categorias` | `CategoriaList` | `MainLayout` | `loadChildren` (diferida) | Categorías |
| `/categorias/nuevo` | `CategoriaForm` | `MainLayout` | `loadChildren` (diferida) | Nueva categoría |
| `/categorias/:id/editar` | `CategoriaForm` | `MainLayout` | `loadChildren` (diferida) | Editar categoría |
| `/clientes` | `ClienteList` | `MainLayout` | `loadChildren` (diferida) | Clientes |
| `/clientes/nuevo` | `ClienteForm` | `MainLayout` | `loadChildren` (diferida) | Nuevo cliente |
| `/clientes/:id/editar` | `ClienteForm` | `MainLayout` | `loadChildren` (diferida) | Editar cliente |
| `/**` | `NoEncontrado` | Ninguna (raíz) | `loadComponent` (diferida) | Página no encontrada |

---

## B3. Tabla de Responsabilidades

Para asegurar el Principio de Responsabilidad Única (SRP) y una estricta separación de conceptos, cada artefacto tiene delimitadas sus funciones:

| Pieza | Tipo | Responsabilidad | Qué NO hace |
| :--- | :--- | :--- | :--- |
| **`ClienteService`** | Servicio (`@Injectable`) | Centralizar la comunicación HTTP con `/api/v1/clientes`, enviar parámetros de paginación/orden y retornar `Observable` tipados. | No manipula el DOM, no muestra alertas o mensajes ni navega entre páginas. |
| **`ClienteList`** | Componente de Página | Administrar las señales de estado de la tabla de clientes (página, tamaño, orden, filtro, datos, carga y error) y reaccionar a eventos del usuario. | No realiza peticiones HTTP directas con `HttpClient` ni conoce las URLs del backend. |
| **`ClienteForm`** | Componente de Página | Gestionar el formulario reactivo de cliente, ejecutar validaciones síncronas de interfaz, emitir peticiones de guardado/edición y mapear errores del backend. | No realiza llamadas HTTP directas ni define las rutas de la aplicación. |
| **`CategoriaService`** | Servicio (`@Injectable`) | Realizar las peticiones HTTP CRUD hacia `/api/v1/categorias` y devolver `Observable` de categorías. | No maneja lógica visual, estado de formularios ni interacción con el usuario. |
| **`CategoriaList`** | Componente de Página | Controlar el estado del catálogo de categorías con Signals, filtrar en memoria con `computed()` y coordinar la confirmación de eliminación. | No construye peticiones HTTP nativas ni navega directamente en respuestas fallidas. |
| **`CategoriaForm`** | Componente de Página | Construir y validar el formulario de categorías (nombre y descripción) y detectar el modo edición mediante el binding `:id/editar`. | No gestiona la persistencia de datos ni interactúa con la API sin el servicio. |
| **`Header`** | Componente de Layout | Renderizar la marca PharmaSoft, los enlaces generales y emitir el evento `toggleMenu` mediante `output<void>()` al presionar ☰. | No decide cómo se colapsa la cuadrícula ni almacena el estado de visibilidad del sidebar. |
| **`Sidebar`** | Componente de Layout | Iterar sobre el arreglo `MENU` con `@for` para mostrar los accesos a los módulos y resaltar la ruta activa con `routerLinkActive`. | No define las rutas de la aplicación ni controla el colapso del menú lateral. |
| **`MainLayout`** | Componente Contenedor | Definir la cuadrícula CSS Grid general, coordinar el estado reactivo del menú (`menuColapsado`) y proyectar las vistas hijas en `<router-outlet />`. | No conoce la lógica de negocio de los módulos ni procesa datos de clientes o categorías. |

---

## B4. Flujo de una Operación: «Registrar Cliente»

### Recorrido Paso a Paso del Flujo

El flujo describe el ciclo de vida completo de la operación desde que el usuario interactúa con la vista hasta la actualización de la tabla, incluyendo el escenario de éxito y la variante de error:

| Paso | Origen | Destino | Acción / Payload | Respuesta HTTP / Efecto |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Usuario | `ClienteForm` (Vista) | Clic en el botón "Registrar" o "Guardar". | Se activa el manejador `onSubmit()` en el formulario reactivo. |
| **2** | `ClienteForm` | Validación local | Verifica síncronamente reglas de validación (DNI de 8 dígitos, nombres, correo, teléfono opcional de 9 dígitos). | Si el formulario es inválido, resalta los campos con error y detiene la ejecución. |
| **3** | `ClienteForm` | Normalización DTO | Convierte cadenas vacías `""` en `null` para campos opcionales (`telefono: v.telefono.trim() \|\| null`). | Previene error 400 por validación de patrones vacíos en el backend. |
| **4** | `ClienteForm` | `ClienteService` | Invoca el método `crear(clienteRequest)`. | `ClienteService` prepara la llamada HTTP retornando un Observable. |
| **5** | `ClienteService` | PharmaBackend (API REST) | Envía petición HTTP `POST /api/v1/clientes` con el cuerpo JSON del cliente. | Petición asíncrona de red hacia Spring Boot. |
| **6a** | PharmaBackend | `ClienteService` | **Caso Exitoso:** Backend valida, persiste en BD y responde con el nuevo cliente. | **`201 Created`** con cuerpo `ClienteResponseDTO`. |
| **7a** | `ClienteService` | `ClienteForm` | El Observable emite el valor exitoso en el callback `next`. | `ClienteForm` desactiva señal `guardando()`. |
| **8a** | `ClienteForm` | Angular Router | Ejecuta `this.router.navigate(['/clientes'], { queryParams: { exito: '...' } })`. | Redirección hacia la vista de listado. |
| **9a** | Angular Router | `ClienteList` | El enrutador monta el componente `ClienteList` en el `<router-outlet />`. | En su `ngOnInit()`, invoca `this.cargar()`. |
| **10a** | `ClienteList` | `ClienteService` | Invoca `listar(pagina=0, tamanio=10, ordenarPor='apellidos', direccion='asc')`. | Envía `GET /api/v1/clientes?pagina=0...` al backend. |
| **11a** | PharmaBackend | `ClienteList` | Backend retorna la página de clientes con la nueva fila incluida. | **`200 OK`** con `PaginaResponseDTO`. |
| **12a** | `ClienteList` | Vista del Usuario | Se actualiza la signal `respuesta()`; Angular re-renderiza la tabla y muestra mensaje de éxito verde. | La nueva fila aparece inmediatamente en la tabla. |
| **6b** | PharmaBackend | `ClienteService` | **Caso Error (409 Conflict):** DNI o correo electrónico ya registrados previamente. | **`409 Conflict`** con cuerpo `ErrorResponseDTO`. |
| **7b** | `ClienteService` | `ClienteForm` | El Observable emite error HTTP en el callback `error`. | `ClienteForm` captura la excepción `HttpErrorResponse`. |
| **8b** | `ClienteForm` | `http-error.ts` | Invoca `mensajeError(err)` para extraer el mensaje específico emitido por Spring Boot. | Se procesa el DTO de error del servidor. |
| **9b** | `ClienteForm` | Vista del Usuario | Actualiza las señales `error.set(mensaje)` y `guardando.set(false)`. | Se renderiza una alerta roja superior con el mensaje del backend sin perder los datos tipeados. |

---

## B5. Preguntas de Revisión

### 1. ¿Cuántos archivos existentes tuviste que modificar para agregar el módulo Clientes? Nómbralos. ¿Qué dice ese número sobre la arquitectura?

Se modificaron únicamente **2 archivos existentes** del proyecto: `src/app/core/config/menu.ts` (Línea 10), donde se agregó la entrada `{ etiqueta: 'Clientes', ruta: '/clientes', icono: '👥' }`; y `src/app/app.routes.ts` (Líneas 20–24), donde se registró la ruta diferida `clientes` mediante `loadChildren`. Este número reducido demuestra que la arquitectura cumple estrictamente el **Principio Abierto/Cerrado (Open/Closed Principle)**, ya que la aplicación estuvo abierta a la extensión para incorporar un dominio completo de negocio (con sus páginas, modelos, servicios y rutas propias) pero totalmente cerrada a la modificación, sin necesidad de alterar una sola línea de código en los módulos preexistentes como Categorías, Inicio o Layout.

### 2. ¿Por qué el componente de listado no usa HttpClient directamente? ¿Qué pasaría si mañana cambia la URL de la API?

El componente `ClienteList` (`src/app/features/clientes/pages/cliente-list/cliente-list.ts`, Línea 16) no consume `HttpClient` directamente para preservar el **Principio de Responsabilidad Única (SRP)**, manteniendo al componente enfocado exclusivamente en la gestión del estado reactivo de la vista y la interacción del usuario, mientras que delega toda la parametrización de red y contratos HTTP en `ClienteService` (`src/app/features/clientes/services/cliente-service.ts`, Líneas 10–11). Si el día de mañana la URL base del backend o la versión de la API cambia (por ejemplo, a `/api/v2/clientes`), **solo se tendría que modificar una única línea** en `cliente-service.ts` (Línea 11); en cambio, si los componentes llamaran directamente a `HttpClient`, se generaría un alto acoplamiento que obligaría a rastrear y modificar manualmente múltiples archivos y vistas del proyecto, aumentando exponencialmente el riesgo de inconsistencias y errores.

### 3. ¿Qué ventaja concreta tiene cargar Clientes con loadChildren en lugar de importar sus componentes en app.routes.ts? Verifícalo con ng build y copia la línea del chunk de clientes que aparece en la salida.

La ventaja concreta radica en la **Carga Diferida (*Lazy Loading*)**, la cual optimiza drásticamente el rendimiento de carga inicial (*First Contentful Paint*) al impedir que el código TypeScript, las plantillas HTML y las hojas de estilo del módulo Clientes se descarguen cuando el usuario accede por primera vez al sistema, transfiriéndolos únicamente bajo demanda cuando se navega hacia la ruta `/clientes`. Esta modularización física se verificó ejecutando `ng build`, cuya salida de compilación generó un fragmento desacoplado e independiente reflejado en la siguiente línea:
```text
chunk-jr0Debh5.js   | clientes-routes   |  14.90 kB |                 4.26 kB
```
Dicha evidencia certifica que los 14.90 kB del módulo quedan segregados fuera del paquete principal (`main.js`), garantizando un despliegue ligero y escalable.

### 4. ¿Por qué el encabezado y el sidebar no se vuelven a dibujar al pasar de Categorías a Clientes?

Porque tanto el encabezado (`Header`) como la barra lateral (`Sidebar`) están instanciados dentro del componente contenedor persistente `MainLayout` (`src/app/layout/main-layout/main-layout.ts`, Líneas 7–12; y `src/app/layout/main-layout/main-layout.html`, Líneas 2–6), el cual está configurado como la ruta padre en `src/app/app.routes.ts` (Líneas 6–25). Al navegar entre las rutas secundarias `/categorias` y `/clientes`, el motor de enrutamiento de Angular detecta que ambas comparten la misma ruta padre activa, por lo que preserva intacta la instancia de `MainLayout` en el DOM y se limita a destruir y montar el componente correspondiente dentro del `<router-outlet />` situado en el área principal (`main`), evitando cualquier parpadeo o recarga innecesaria de la interfaz circundante.

### 5. Si en la sesión 11 algunos usuarios no deben ver «Clientes», ¿en qué archivo harías el cambio y por qué bastaría con ese punto?

El cambio se realizaría exclusivamente en el archivo de configuración centralizado `src/app/core/config/menu.ts` (Línea 10), o bien filtrando dicho arreglo mediante un servicio de autenticación reactivo con control de roles (RBAC) antes de exponerlo. Bastaría con intervenir únicamente en este punto porque el componente `Sidebar` (`src/app/layout/sidebar/sidebar.ts`, Líneas 3 y 12; y `src/app/layout/sidebar/sidebar.html`, Líneas 3–7) no tiene enlaces fijos o quemados en su plantilla HTML, sino que genera su menú dinámicamente iterando sobre la colección con `@for (item of menu; track item.ruta)`. Por consiguiente, al eliminar o filtrar el elemento en la fuente de datos, el enlace se remueve de forma automática y reactiva del árbol visual sin tocar ningún componente de interfaz.

### 6. ¿Qué parte del código de Categorías y Clientes está duplicada? Propón una forma de reutilizarla, aunque no la implementes.

Existe una clara duplicación de código en la gestión del ciclo de vida y estado reactivo de las tablas en `src/app/features/categorias/pages/categoria-list/categoria-list.ts` (Líneas 19–52) y `src/app/features/clientes/pages/cliente-list/cliente-list.ts` (Líneas 26–60): ambas definen señales idénticas (`cargando`, `error`, `mensajeExito`, `filtro`), temporizadores de 3 segundos para el desvanecimiento de alertas (`mostrarError`, `mostrarExito`), computaciones de filtrado en memoria y diálogos modales de confirmación para eliminación o baja física/lógica. Para reutilizar esta lógica transversal, se propone diseñar una función componible (*composable pattern*) en `core/utils/` o `shared/` denominada `useCrudList<T>(servicio, opciones)` o una clase base abstracta `BaseCrudList<T>`, la cual encapsule internamente la administración de las señales reactivas, el manejo estandarizado de `HttpErrorResponse` y las operaciones auxiliares, reduciendo los componentes de listado a una simple invocación configurada con el servicio y columnas correspondientes.

### 7. El buscador de Clientes solo filtra la página actual. Explica por qué ocurre y qué tendría que cambiar en el backend y en ClienteService para buscar entre todos los clientes.

Esto ocurre porque la señal computada `filtrados = computed(...)` en `src/app/features/clientes/pages/cliente-list/cliente-list.ts` (Líneas 32–47) ejecuta su función de filtrado puramente en la memoria del navegador (*in-memory*) sobre el arreglo `this.respuesta()?.contenido`, el cual contiene únicamente los registros de la página en curso devuelta por el servidor (por defecto 10 elementos), desconociendo los registros de las páginas restantes. Para permitir la búsqueda global en toda la base de datos: en el backend (`PharmaBackend`), el repositorio `ClienteRepository` debe implementar un método de consulta derivada como `findByDniContainingOrNombresContainingIgnoreCaseOrApellidosContainingIgnoreCase(String texto, Pageable pageable)` y el controlador `ClienteController` debe recibir el parámetro opcional `@RequestParam(required = false) String buscar`; en el frontend, el método `listar()` de `src/app/features/clientes/services/cliente-service.ts` (Líneas 13–25) debe aceptar `buscar?: string` y añadirlo a los `HttpParams`; y finalmente, en `ClienteList`, el campo de texto debe emitir el término de búsqueda (preferiblemente con debounce) para solicitar una nueva página al servidor reseteando la paginación a la página 0.

---

## B6. Casos de Prueba para Evidencias (Paso A7)

Matriz de verificación técnica correspondiente a los 11 casos de prueba solicitados en la actividad:

| N.º | Acción a Ejecutar | Resultado Esperado | Detalle en Pestaña Red (F12) |
| :---: | :--- | :--- | :--- |
| **1** | Entrar a «Clientes» desde el sidebar | Primera página de clientes cargada (10 registros) y opción «Clientes» resaltada. | `GET /api/v1/clientes?pagina=0&tamanio=10...` (200 OK) |
| **2** | Cambiar el tamaño a 5 y pulsar «Siguiente» | Carga la página 2 con 5 registros; texto indica «Página 2 de X». | `GET /api/v1/clientes?pagina=1&tamanio=5...` (200 OK) |
| **3** | Ordenar por apellidos y volver a hacer clic | Tabla invierte su ordenamiento de ascendente a descendente. | `GET ...&direccion=asc` y luego `direccion=desc` (200 OK) |
| **4** | Registrar un cliente con DNI de 7 dígitos | Muestra mensaje: *"El DNI es obligatorio y debe tener exactamente 8 dígitos"*. | Validación local síncrona: **No se envía petición al servidor**. |
| **5** | Registrar cliente válido sin teléfono ni dirección | Registro exitoso y redirección al listado; teléfono muestra «—». | `POST /api/v1/clientes` con campos opcionales en `null` (201 Created) |
| **6** | Registrar otro cliente con el mismo DNI o correo | Alerta roja superior con mensaje descriptivo retornado por el backend. | `POST /api/v1/clientes` con error `409 Conflict` (`ErrorResponseDTO`). |
| **7** | Editar el teléfono con 9 dígitos | Formulario precarga datos; al guardar actualiza el registro en la tabla. | `PUT /api/v1/clientes/{id}` (200 OK) |
| **8** | Buscar por parte del DNI y luego por apellido | La tabla filtra en tiempo real los registros de la página actual. | **Sin peticiones HTTP** (operación reactiva mediante `computed()`). |
| **9** | Dar de baja un cliente activo | Cuadro modal de confirmación; tras aceptar, la fila muestra estado «Inactivo». | `DELETE /api/v1/clientes/{id}` (204 No Content) |
| **10** | Intentar dar de baja otra vez al mismo cliente | Alerta con el mensaje de regla de negocio emitida por Spring Boot. | `DELETE /api/v1/clientes/{id}` (409 Conflict) |
| **11** | Volver al módulo «Categorías» | El módulo Categorías funciona con total normalidad y sin efectos colaterales. | Navegación instantánea por rutas sin recargar la SPA. |
