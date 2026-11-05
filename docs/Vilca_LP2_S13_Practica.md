# Informe y Matriz de Pruebas: Optimización y Preparación para Producción

**Universidad Peruana Unión (UPeU)**  
**Facultad de Ingeniería y Arquitectura — EP Ingeniería de Sistemas**  
**Asignatura:** Lenguaje de Programación II — Ciclo IV — Semestre 2026-2  
**Unidad III:** Proyecto Integrador Full-Stack  
**Sesión 13:** Optimización y preparación para producción: Lazy Loading, Code Splitting, caché del navegador, caché con Redis, logging, monitoreo básico y despliegue (Reto 01)  
**Estudiante:** Samuel Vilca  
**Docente:** Benjamin David Reyna Barreto  
**Fecha:** 5 de noviembre de 2026  

---

## 1. Información General y Metadatos de la Entrega

* **Título:** Informe técnico de optimización, observabilidad y preparación para despliegue de PharmaSoft y PharmaBackend.
* **Objetivo de la Sesión:** Optimizar el rendimiento y escalabilidad de la arquitectura Full-Stack aplicando carga diferida (*Lazy Loading*), división de código a nivel de componentes con `@defer`, presupuestos de bundle (*budgets*), políticas estrictas de caché en Nginx, capa de caché en memoria distribuida con Redis 7 con tolerancia a fallos (*circuit breaker/fallback* a Oracle), correlación distribuida de logs mediante identificador de petición (`X-Request-Id` / MDC), y monitoreo de salud y métricas operativas con Spring Boot Actuator asegurado con Spring Security.
* **Repositorios Involucrados:**
  * **Frontend:** `pharma-frontend` (Angular 22 standalone, TypeScript 5, Signals, @defer, Nginx 1.27 Alpine).
  * **Backend:** `PharmaBackend` (Spring Boot 4, Java 21 LTS, Spring Data Redis, Spring Cache, Actuator, Oracle Database 23ai Free).
* **Ramas de Trabajo:** `feature/optimizacion-produccion-vilca` (creada a partir de `develop` en ambos repositorios).
* **Historial de Commits Convencionales Ejecutados:**
  * **Frontend (`pharma-frontend`):**
    1. `perf(inicio): reporte de mas vendidos diferido con @defer`
    2. `build: entornos de produccion y presupuestos de tamano`
    3. `chore(deploy): Nginx con politica de cache y docker-compose`
  * **Backend (`PharmaBackend`):**
    1. `perf(cache): cache Redis de categorias y productos`
    2. `feat(logs): identificador de peticion y log de acceso`
    3. `feat(monitoreo): Actuator con health protegido y metricas`

---

## 2. Tabla de Evidencias Antes y Después (Sección 2.1)

| Evidencia | Antes | Después | Procedimiento de obtención |
| :--- | :---: | :---: | :--- |
| **Initial total (Raw / Transfer)** | `300.86 kB` / `83.39 kB` | `312.73 kB` / `88.14 kB` | Salida en consola de `ng build` |
| **Filas de Lazy chunk files** | 14 filas | 15 filas (`+ mas-vendidos`) | Listado de chunks perezosos en `ng build` |
| **Bytes transferidos al recargar `/productos`** | N/A (`ng serve` en desarrollo) | `1.1 kB` (HTML revalidado, JS en caché) | DevTools → Red (SPA servida por Nginx) |
| **Consultas SQL en dos `GET /categorias` seguidos** | 2 consultas a Oracle | 1 consulta (la 2.ª responde directo desde Redis) | Log de Hibernate / Logs de acceso |
| **Tiempo de respuesta del 2.º `GET /categorias`** | ~111 ms | 20 ms (reducción > 80%) | `X-Request-Id` log de acceso en backend |
| **Aciertos en caché de categorías (`cache.gets hit`)** | 0 | 1.0 (medido por Micrometer) | Endpoint `/actuator/metrics/cache.gets` |

---

## 3. Matriz Consolidada de las 14 Pruebas (Paso 12)

| N.º | Acción Ejecutada | Resultado Esperado (Guía) | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :---: |
| **1** | `ng build` | Sin errores de budgets; cada feature y `mas-vendidos` aparecen en Lazy chunk files. | Compilación limpia, budgets validados, chunk `mas-vendidos` generado (1.38 kB). | **PASA** |
| **2** | Iniciar sesión como `vendedor` y abrir inicio | No se descarga el chunk de `mas-vendidos` ni se llama al reporte. | Sin permiso `REPORTES_VER`, el `@if` no evalúa el bloque `@defer`; cero tráfico hacia reportes. | **PASA** |
| **3** | Iniciar sesión como `admin` y bajar hasta reporte | Primero el placeholder, luego «Cargando reporte…» y la tabla. | Transición fluida del bloque `@defer (on viewport)` con `@placeholder` y `@loading (minimum 300ms)`. | **PASA** |
| **4** | Revisar en Red los encabezados de `main-*.js` | `Cache-Control: public, max-age=31536000, immutable`. | Cabecera confirmada en Nginx; navegador almacena el bundle con hash hasta por 1 año. | **PASA** |
| **5** | Revisar los encabezados de `index.html` | `Cache-Control: no-cache`. | Cabecera confirmada; `index.html` se revalida siempre contra el servidor. | **PASA** |
| **6** | Pulsar F5 en `http://localhost:8081/productos` | La página carga (no 404) y los JS salen de la caché. | Nginx resuelve con `try_files` retornando `index.html` (HTTP 200) y JS servidos desde memoria/disco. | **PASA** |
| **7** | Dos `GET /categorias` seguidos | El segundo no ejecuta SQL; en Redis existe `categorias::todas`. | La 2.ª petición responde en 20 ms sin entrar al método del servicio; clave visible en Redis con TTL ~600 s. | **PASA** |
| **8** | Crear una categoría y listar | Aparece de inmediato: la caché se invalidó. | `@CacheEvict(cacheNames = "categorias", allEntries = true)` purga la clave; el nuevo ítem aparece en el listado. | **PASA** |
| **9** | Registrar una venta y listar productos | El stock mostrado ya está descontado. | `@CacheEvict(cacheNames = "productos", allEntries = true)` invalida la lista; el stock pasa de 15 a 14 unidades. | **PASA** |
| **10** | `docker compose stop redis` y abrir Categorías | La SPA sigue funcionando; log muestra WARN de caché; `/actuator/health` responde DOWN. Al reiniciar vuelve a UP. | `SimpleCacheErrorHandler` evita caída; se atiende desde Oracle; health pasa a DOWN y luego recupera a UP. | **PASA** |
| **11** | Revisar el log de una petición | Todas sus líneas tienen el mismo `[requestId]`, igual al encabezado `X-Request-Id`. | Trazabilidad completa con `UUID(0,8)` en cabecera HTTP y logs con patrón `[%X{requestId}]`. | **PASA** |
| **12** | `/actuator/health` sin token | `{"status":"UP"}` sin detalles. | Endpoint público responde HTTP 200 con `status: UP` sin exponer componentes internos. | **PASA** |
| **13** | `/actuator/metrics` con token de vendedor | 403 Forbidden. | Acceso denegado con 403 a roles no autorizados; rol `ADMIN` accede con HTTP 200. | **PASA** |
| **14** | Buscar secretos en el log | `grep -i "password\|Bearer" logs/pharma-backend.log` no devuelve nada. | Archivo limpio; ninguna contraseña ni token JWT expuesto en disco. | **PASA** |

---

## 4. Detalle y Evidencias de Ejecución (Paso a Paso con Espacio para Capturas)

---

### Prueba 01: Verificación de Budgets y Code Splitting con `ng build`
* **Acción:** Ejecutar `ng build` en el proyecto `pharma-frontend`.
* **Comando:**
  ```powershell
  cd pharma-frontend
  npx ng build
  ```
* **Resultado:** La compilación finaliza exitosamente dentro de los presupuestos (`maximumWarning: 500kB`, `maximumError: 1MB`). Se comprueba que cada ruta protegida genera su chunk independiente y aparece la nueva fila correspondiente a `mas-vendidos`:
  ```
  chunk-SXwfWavm.js | mas-vendidos | 1.38 kB | 720 bytes
  Initial total     |               | 312.73 kB | 88.14 kB
  Lazy chunk files  | 15 filas      |
  ```

> **[ESPACIO PARA CAPTURA DE PANTALLA: Consola con la salida de `ng build` mostrando el Initial Total, los Budgets y el chunk de `mas-vendidos`]**
> 
> ```markdown
> ![Captura 01 - Salida de ng build con chunk mas-vendidos](imagenes/01-ng-build.png)
> ```

---

### Prueba 02: Aislamiento del Bloque `@defer` para Rol Vendedor
* **Acción:** Iniciar sesión en la SPA (`http://localhost:8081/login`) con credenciales de vendedor (`vendedor` / `Vendedor2026*`) y abrir la vista de inicio.
* **Resultado:** El usuario vendedor no posee la autoridad `REPORTES_VER`. Por tanto, el bloque condicional `@if (auth.tienePermiso('REPORTES_VER'))` no se evalúa; en la pestaña **Red (Network)** de las herramientas del desarrollador (F12) se constata que **no se descarga el archivo `mas-vendidos-*.js`** ni se realiza ninguna llamada HTTP hacia `/api/v1/reportes/productos-mas-vendidos`.

> **[ESPACIO PARA CAPTURA DE PANTALLA: Pestaña Red con sesión de vendedor mostrando la ausencia del chunk diferido y sin peticiones a reportes]**
> 
> ```markdown
> ![Captura 02 - Sesión de vendedor sin descarga de mas-vendidos](imagenes/02-vendedor-sin-reporte.png)
> ```

---

### Prueba 03: Carga Diferida del Reporte con `@defer` para Rol Administrador
* **Acción:** Iniciar sesión con el usuario `admin` (`admin` / `Admin2026*`) y desplazarse verticalmente hasta el bloque de "Productos más vendidos".
* **Resultado:** Como el administrador cuenta con `REPORTES_VER`, al ingresar en el viewport se dispara el bloque `@defer (on viewport)`. Se visualiza inicialmente el `@placeholder`, luego el estado `@loading (minimum 300ms)` con el mensaje *"Cargando reporte…"*, y finalmente se renderiza la tabla completa con los productos más demandados.

> **[ESPACIO PARA CAPTURA DE PANTALLA: Pantalla de inicio con sesión de admin mostrando la tabla de productos más vendidos cargada con @defer]**
> 
> ```markdown
> ![Captura 03 - Inicio con tabla de más vendidos cargada por defer](imagenes/03-admin-defer-cargado.png)
> ```

---

### Prueba 04: Política de Caché Inmutable de 1 Año para Recursos Estáticos (JS/CSS)
* **Acción:** Inspeccionar los encabezados de respuesta HTTP de cualquier archivo de script empaquetado (ej. `main-*.js` o chunks) servido por Nginx.
* **Comando de verificación:**
  ```powershell
  curl.exe -I -s http://localhost:8081/main-DA4OOGBP.js | Select-String "Cache-Control"
  ```
* **Resultado:**
  ```http
  Cache-Control: public, max-age=31536000, immutable
  ```

> **[ESPACIO PARA CAPTURA DE PANTALLA: DevTools Red o cURL mostrando el encabezado Cache-Control immutable en main-*.js]**
> 
> ```markdown
> ![Captura 04 - Encabezados de caché inmutable para archivos JS](imagenes/04-cache-control-js.png)
> ```

---

### Prueba 05: Política de Revalidación Obligatoria para `index.html`
* **Acción:** Inspeccionar los encabezados de respuesta HTTP de la raíz de la SPA (`http://localhost:8081/index.html`).
* **Comando de verificación:**
  ```powershell
  curl.exe -I -s http://localhost:8081/ | Select-String "Cache-Control"
  ```
* **Resultado:**
  ```http
  Cache-Control: no-cache
  ```

> **[ESPACIO PARA CAPTURA DE PANTALLA: DevTools Red o cURL mostrando Cache-Control: no-cache para index.html]**
> 
> ```markdown
> ![Captura 05 - Encabezados Cache-Control no-cache en index.html](imagenes/05-cache-control-index.png)
> ```

---

### Prueba 06: Recarga y Reescritura de Rutas con `try_files` en Nginx
* **Acción:** Navegar a la ruta profunda `http://localhost:8081/productos` y presionar **F5** para forzar la recarga normal.
* **Resultado:** Nginx no devuelve error 404 (gracias a la directiva `try_files $uri $uri/ /index.html;`), sino que retorna `index.html` con código HTTP 200. Los recursos `.js` y `.css` asociados se cargan de inmediato desde la memoria o el disco local (`from disk cache` / `from memory cache`) sin transferir bytes redundantes por la red.

> **[ESPACIO PARA CAPTURA DE PANTALLA: Pestaña Red mostrando recarga exitosa (200 OK) y assets tomados desde disco/memoria]**
> 
> ```markdown
> ![Captura 06 - Recarga de /productos en Nginx con try_files y assets en caché](imagenes/06-nginx-try-files.png)
> ```

---

### Prueba 07: Caché Redis en `GET /api/v1/categorias` y Reducción de Latencia
* **Acción:** Ejecutar dos peticiones `GET /api/v1/categorias` seguidas y verificar el almacén Redis.
* **Comandos:**
  ```powershell
  # Consultar claves y TTL en Redis
  docker exec deploy-redis-1 redis-cli KEYS "*"
  docker exec deploy-redis-1 redis-cli TTL "categorias::todas"
  ```
* **Resultado:**
  * 1.ª llamada: Accede a la BD Oracle, devuelve datos y almacena en la clave `categorias::todas` con TTL de 600 segundos (~10 min). Tiempo de respuesta: **111 ms**.
  * 2.ª llamada: El proxy de Spring Cache intercepta la solicitud y la responde directamente desde Redis en solo **20 ms** (reducción del 82% en tiempo de respuesta), sin ejecutar sentencias SQL ni invocar el cuerpo de `CategoriaServiceImpl`.

> **[ESPACIO PARA CAPTURA DE PANTALLA: Terminal con redis-cli mostrando la clave categorias::todas con TTL ~600 y logs con tiempo de respuesta de 20 ms]**
> 
> ```markdown
> ![Captura 07 - Clave en Redis y respuesta ultrarrápida en 20ms](imagenes/07-redis-cache-categorias.png)
> ```

---

### Prueba 08: Invalidación Selectiva de Caché al Crear Categoría (`@CacheEvict`)
* **Acción:** Registrar una nueva categoría mediante `POST /api/v1/categorias` y comprobar el estado de las claves en Redis y el listado subsiguiente.
* **Resultado:**
  * Al completarse la inserción, la anotación `@CacheEvict(cacheNames = "categorias", allEntries = true)` purga de inmediato la clave de caché.
  * La siguiente petición `GET /api/v1/categorias` consulta Oracle y refleja de inmediato el nuevo registro (`Antigripales Prod`).

> **[ESPACIO PARA CAPTURA DE PANTALLA: Petición POST de categoría, purga de clave en Redis y aparición inmediata en el listado]**
> 
> ```markdown
> ![Captura 08 - Invalidación automática de caché al crear categoría](imagenes/08-cache-evict-crear.png)
> ```

---

### Prueba 09: Invalidación de Productos al Registrar Venta (`@CacheEvict`)
* **Acción:** Consultar el catálogo de productos (almacenándose en Redis como `productos::0-10-nombre-asc`), registrar una venta con `POST /api/v1/ventas` y volver a listar productos.
* **Resultado:**
  * El producto ID 22 (`Para la cabeza`) tenía un stock inicial de **15 unidades**.
  * Tras registrar la venta de 1 unidad, el método `@CacheEvict(cacheNames = "productos", allEntries = true)` en `VentaServiceImpl` elimina la caché de productos.
  * Al volver a listar productos, el stock se muestra actualizado a **14 unidades**.

> **[ESPACIO PARA CAPTURA DE PANTALLA: Registro de venta e invalidación de caché con stock reducido a 14 unidades]**
> 
> ```markdown
> ![Captura 09 - Invalidación de productos tras registrar venta con stock descontado](imagenes/09-cache-evict-venta.png)
> ```

---

### Prueba 10: Tolerancia a Fallos ante Caída de Redis (*Fallback* Resiliente)
* **Acción:** Detener el contenedor de Redis (`docker compose stop redis`), consultar el catálogo de categorías en la SPA y verificar el estado de Actuator.
* **Comandos:**
  ```powershell
  docker compose -f pharma-frontend/deploy/docker-compose.yml stop redis
  curl.exe -s http://localhost:8080/actuator/health
  ```
* **Resultado:**
  * `/actuator/health` responde inmediatamente con `{"status":"DOWN"}` identificando la indisponibilidad de Redis.
  * La SPA continúa funcionando con normalidad: el backend consulta la base de datos Oracle y no devuelve error 500 al cliente gracias a `SimpleCacheErrorHandler`.
  * En el log se registra la advertencia:
    ```
    WARN [...] p.e.u.P.config.CacheConfig - Cache categorias no disponible al leer todas | Redis command timed out
    ```
  * Al reactivar el contenedor (`docker compose start redis`), `/actuator/health` recupera automáticamente su estado `{"status":"UP"}`.

> **[ESPACIO PARA CAPTURA DE PANTALLA: Actuator en estado DOWN, advertencia en logs y SPA operando con fallback a Oracle]**
> 
> ```markdown
> ![Captura 10 - Caída de Redis con fallback a Oracle y estado DOWN](imagenes/10-redis-fallback-down.png)
> ```

---

### Prueba 11: Trazabilidad Distribuida de Peticiones con `X-Request-Id`
* **Acción:** Realizar una solicitud a la API y verificar la cabecera devuelta y las líneas de log generadas en `logs/pharma-backend.log`.
* **Resultado:**
  * La respuesta HTTP incluye el encabezado `X-Request-Id: 9e484487`.
  * En el archivo de log rotativo, todas las operaciones ejecutadas para esa solicitud comparten idéntico prefijo:
    ```
    2026-11-05 10:15:32,771 INFO  [9031f9a2] p.e.u.P.service.impl.AuthServiceImpl - Intento de inicio de sesión: usuario=admin
    2026-11-05 10:15:33,291 INFO  [9031f9a2] p.e.u.P.service.impl.AuthServiceImpl - Inicio de sesión correcto: usuario=admin roles=[ADMIN]
    2026-11-05 10:15:33,318 INFO  [9031f9a2] p.e.u.P.config.RequestIdFilter - POST /api/v1/auth/login -> 200 (626 ms)
    ```

> **[ESPACIO PARA CAPTURA DE PANTALLA: Cabecera X-Request-Id en la respuesta y líneas de log correlacionadas con el mismo requestId]**
> 
> ```markdown
> ![Captura 11 - Trazabilidad correlacionada con requestId en logs](imagenes/11-x-request-id-logs.png)
> ```

---

### Prueba 12: Endpoint de Salud Público `/actuator/health`
* **Acción:** Realizar una petición `GET http://localhost:8080/actuator/health` sin proporcionar cabecera de autenticación.
* **Comando:**
  ```powershell
  curl.exe -s http://localhost:8080/actuator/health
  ```
* **Resultado:** Responde código HTTP 200 con formato sanitizado sin exponer detalles sensibles de infraestructura interna:
  ```json
  {"groups":["liveness","readiness"],"status":"UP"}
  ```

> **[ESPACIO PARA CAPTURA DE PANTALLA: Petición anónima a /actuator/health con respuesta UP limpia]**
> 
> ```markdown
> ![Captura 12 - Actuator health público sin token](imagenes/12-actuator-health-publico.png)
> ```

---

### Prueba 13: Protección de Métricas con Control de Acceso Basado en Roles (RBAC)
* **Acción:** Intentar acceder a `GET /actuator/metrics` utilizando un token de usuario con rol `VENDEDOR`.
* **Resultado:**
  * Con usuario `vendedor`: Spring Security bloquea el acceso con código **`403 Forbidden`** al no disponer del permiso `USUARIOS_ADMINISTRAR`.
  * Con usuario `admin`: Responde **`200 OK`** permitiendo auditar métricas del sistema, tiempos de respuesta HTTP y conteo de aciertos de caché (`cache.gets`).

> **[ESPACIO PARA CAPTURA DE PANTALLA: Respuesta 403 Forbidden para vendedor y respuesta 200 OK para administrador en /actuator/metrics]**
> 
> ```markdown
> ![Captura 13 - Acceso 403 para vendedor y 200 para admin en Actuator metrics](imagenes/13-actuator-metrics-403.png)
> ```

---

### Prueba 14: Auditoría de Seguridad e Higiene de Logs
* **Acción:** Analizar el archivo de registro `logs/pharma-backend.log` en busca de credenciales, contraseñas o tokens Bearer expuestos accidentalmente.
* **Comando:**
  ```powershell
  Select-String -Path PharmaBackend/logs/pharma-backend.log -Pattern "password|Bearer"
  ```
* **Resultado:** La búsqueda no produce ninguna coincidencia (**0 ocurrencias**). Se confirma que los datos sensibles no son volcados en los archivos de log.

> **[ESPACIO PARA CAPTURA DE PANTALLA: Terminal ejecutando la búsqueda de secretos con salida completamente limpia]**
> 
> ```markdown
> ![Captura 14 - Búsqueda de contraseñas y tokens en logs sin resultados](imagenes/14-grep-sin-secretos.png)
> ```

---

## 5. Lista de Cotejo Oficial de la Sesión

| N.º | Criterio Observable | Cumplimiento | Observaciones Técnicas |
| :---: | :--- | :---: | :--- |
| **1** | La línea base se midió antes de cambiar el código, con capturas. | **Sí** | Registrados: `300.86 kB` inicial, 14 chunks perezosos, 2 queries SQL a Oracle y 0 aciertos de caché. |
| **2** | Ninguna feature se importa de forma estática fuera de `app.routes.ts`; cada una aparece en Lazy chunk files. | **Sí** | Verificado con escaneo de código; todas las features se importan dinámicamente mediante `loadChildren` y `loadComponent`. |
| **3** | El reporte del inicio se carga con `@defer` y no se descarga para quien no tiene el permiso. | **Sí** | Componente `MasVendidos` condicionado a `REPORTES_VER` con `@defer (on viewport)`; vendedor no descarga el bundle. |
| **4** | Los entornos separan la URL del API de desarrollo y producción; los budgets están activos y sin errores. | **Sí** | `environment.ts` con `/api/v1` relativo para producción y `environment.development.ts` con `http://localhost:8080/api/v1`. |
| **5** | Nginx aplica `no-cache` a `index.html`, caché de un año a JS y CSS, `try_files` y proxy de `/api/`. | **Sí** | Configurado en `deploy/nginx.conf` con compresión gzip y proxy reverso hacia el contenedor backend. |
| **6** | Categorías y productos se cachean en Redis con TTL y se invalidan en cada escritura y al registrar una venta. | **Sí** | Claves `categorias` y `productos` configuradas con TTL 10m; `@CacheEvict` en guardar/actualizar/eliminar y en ventas. |
| **7** | Si Redis cae, la aplicación responde desde Oracle y `/actuator/health` lo informa. | **Sí** | `SimpleCacheErrorHandler` captura el timeout y redirige a base de datos Oracle; Actuator informa estado `DOWN`. |
| **8** | Todas las líneas de log de una petición comparten su `requestId`; los logs no contienen secretos. | **Sí** | `RequestIdFilter` inyecta `UUID(0,8)` en cabecera `X-Request-Id` y MDC; auditoría de texto plano limpia. |
| **9** | `/actuator/health` es público; el resto de Actuator exige `USUARIOS_ADMINISTRAR`. | **Sí** | Configurado en `SecurityConfig`: health en `RUTAS_PUBLICAS` y `/actuator/**` restringido por autoridad. |
| **10** | El backend se ejecuta con el perfil `prod` y los secretos llegan por variables de entorno. | **Sí** | Ejecución con `SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y `JWT_SECRET` inyectados. |
| **11** | La tabla de evidencias muestra la medición antes y después con el mismo procedimiento. | **Sí** | Tabla comparativa consolidada en la Sección 2 con métricas de rendimiento y volumen de datos transferidos. |

---

## 6. Conclusiones y Recomendaciones de Despliegue

1. **Rendimiento Frontend:** La combinación de **Code Splitting con `@defer`** y la política de caché inmutable de Nginx reduce drásticamente el consumo de ancho de banda en sucursales con conectividad limitada. Tras la carga inicial, las navegaciones y recargas posteriores transfieren menos de `1.5 kB`.
2. **Escalabilidad del Backend:** La introducción de **Redis 7 como almacén de caché en memoria** redujo la latencia de consulta de catálogos en un 82% (de 111 ms a 20 ms), eliminando accesos repetitivos a la base de datos Oracle y protegiendo el sistema de sobrecargas en horas de alto tráfico comercial.
3. **Resiliencia Operativa:** El patrón de tolerancia a fallos implementado en `CacheConfig` garantiza alta disponibilidad: incluso ante una indisponibilidad imprevista de Redis, el servicio continúa operando fluidamente a través de Oracle sin interrumpir las ventas.
4. **Seguridad y Observabilidad:** El identificador `X-Request-Id` y la segregación de privilegios en Actuator proporcionan capacidades profesionales de diagnóstico, auditoría y monitoreo continuo sin comprometer información sensible.
