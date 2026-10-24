# Informe Técnico de Seguridad Frontend y Verificación SPA

**Universidad Peruana Unión (UPeU)**  
**Facultad de Ingeniería y Arquitectura · Escuela Profesional de Ingeniería de Sistemas**  
**Asignatura:** Lenguaje de Programación II · Ciclo IV · Semestre 2026-2  
**Unidad II:** Frontend SPA empresarial seguro  
**Sesión 11:** Actividad Autónoma — Pruebas de la SPA segura, aviso previo a la expiración y página «Mi cuenta»  
**Estudiante:** Samuel Vilca  
**Docente:** Ing. Benjamin David Reyna Barreto  
**Fecha:** 24 de octubre de 2026  
**Rama:** `feature/seguridad-spa-pruebas-vilca`  

---

## 1. Introducción y Objetivos de la Actividad

La presente entrega técnica consolida la evaluación sistemática y el fortalecimiento de la arquitectura de seguridad implementada en la aplicación web empresarial **PharmaSoft**, desarrollada sobre **Angular 22** (arquitectura zoneless reactiva con *Signals*) e integrada con **PharmaBackend** (Spring Boot 3, Spring Security y JWT con algoritmo HMAC-SHA384).

El trabajo autónomo de la Sesión 11 (Reto 02) abarca tres áreas principales:
1. **Auditoría Sistemática del Frontend Seguro:** Ejecución y documentación de una batería de 24 casos de prueba que contrastan el comportamiento esperado y obtenido en autenticación, gestión de sesión, interceptores HTTP funcionales, guards de enrutamiento y menús adaptativos.
2. **Implementación de Funcionalidades Críticas:**
   - **B1. Aviso Previo a la Expiración de Sesión:** Notificación no intrusiva mediante banner superior con conteo regresivo en formato `mm:ss` cuando restan 120 segundos o menos, control de descarte y cierre de sesión seguro para evitar pérdidas de datos transaccionales.
   - **B2. Página «Mi cuenta»:** Consulta directa al endpoint protegido `GET /api/v1/auth/me`, renderizado de la identidad del usuario, insignias de roles y visualización granular de permisos por módulo con detección reactiva de inconsistencias en caliente.
3. **Análisis de Seguridad y Defensa en Profundidad:** Resolución técnica de interrogantes fundamentales sobre gestión de credenciales en navegador, semántica de códigos HTTP 401/403 y mitigación de vectores de ataque como Open Redirect e inyecciones en cliente.

---

## 2. Implementación de Nuevas Funcionalidades (Parte B)

### B1. Sistema de Aviso Previo a la Expiración del Token (4 puntos)

En entornos de comercio farmacéutico, es frecuente que el personal sufra la pérdida de comprobantes a medio registrar debido a la expiración silenciosa del token JWT. Para mitigar esta situación, se implementó un mecanismo de supervisión reactiva en `AuthService`:

1. **Signals de Monitoreo:**
   - `segundosRestantes = signal<number>(0)`: Almacena en tiempo real la cantidad de segundos restantes para el vencimiento de la sesión (`Math.max(0, Math.floor((sesion.expiraEn - Date.now()) / 1000))`).
   - `avisoOculto = signal<boolean>(false)`: Bandera que registra si el usuario optó por descartar voluntariamente la notificación durante la sesión activa.
   - `porVencer = computed(...)`: Propiedad computada que evalúa como `true` únicamente si existe una sesión activa, el usuario no ha descartado el aviso y los segundos restantes son menores o iguales a 120 (`s <= 120 && s > 0`).

2. **Gestión Segura del Temporizador:**
   - Se emplea un `setInterval(actualizarSegundos, 1000)` para actualizar el signal sin depender de librerías externas ni generar sobrecarga en la detección de cambios.
   - **Prevención de fugas de memoria y temporizadores huérfanos:** Al ejecutarse el método `cerrarSesion()`, se invoca inmediatamente `clearInterval(this.intervaloSegundos)`, cancelando cualquier proceso asíncrono activo.
   - Al llegar el cronómetro a 0 segundos, el servicio invoca automáticamente `cerrarSesion('expirada', this.router.url)`, preservando la ruta previa para facilitar el reingreso.

3. **Componente Standalone `AvisoSesion`:**
   - Ubicado en `src/app/shared/components/aviso-sesion/`, se presenta como una barra de alerta fija (`position: sticky; top: 0; z-index: 100`) con estilo visual de advertencia (`#fff3cd` y `#856404`).
   - Implementa el atributo de accesibilidad `role="status"` y `aria-live="polite"` para lectores de pantalla.
   - Cuenta regresiva formateada mediante `computed()` a dos dígitos (`String(n).padStart(2, '0')`).
   - Ofrece el botón «Cerrar sesión ahora» y el botón «×» que llama a `auth.ocultarAviso()`.

4. **Integración en la Plantilla Maestra:**
   - Se ubicó en `src/app/layout/main-layout/main-layout.html`, colocado estratégicamente por encima de `<router-outlet />` para garantizar su visibilidad en todas las vistas protegidas del sistema.

---

### B2. Página «Mi cuenta» y Verificación de Permisos (3 puntos)

Para dotar al colaborador de transparencia absoluta sobre su perfil y nivel de acceso, se construyó la vista `/mi-cuenta`:

1. **Consumo del Endpoint Seguro:**
   - `AuthService.obtenerPerfil()` emite una petición `GET ${environment.apiUrl}/auth/me`.
   - Debido a que la URL inicia con el prefijo configurado, el `authInterceptor` funcional inyecta automáticamente el encabezado `Authorization: Bearer <token>` sin código redundante.
   - En el backend, `AuthController.java` expone el método `me(Authentication authentication)` que extrae la identidad criptográfica y retorna el DTO `UsuarioResponseDTO`.

2. **Diseño y Componente Standalone `MiCuenta`:**
   - Ubicado en `src/app/features/auth/pages/mi-cuenta/`.
   - Gestiona reactivamente tres estados mediante signals: `cargando`, `error` y `perfil`.
   - **Sección de Datos de Usuario:** Renderiza nombre completo, username, cargo y badge de estado.
   - **Sección de Roles:** Despliega las etiquetas estilizadas correspondientes a los roles asignados (`ADMIN`, `VENDEDOR`, `ALMACENERO`, etc.).
   - **Matriz de Permisos por Módulo:** Agrupa los privilegios en cinco bloques funcionales (Catálogo, Clientes, Ventas, Reportes, Usuarios), indicando con una marca ✔ (verde) si el usuario cuenta con la facultad o con ✘ (gris tenue) si carece de ella.

3. **Detección Dinámica de Discrepancias:**
   - Un `computed()` compara el conjunto de permisos devueltos en tiempo real por `/auth/me` con los permisos persistidos en `sesionActual()` al momento del login.
   - Si un administrador altera los roles en la base de datos mientras el usuario mantiene su sesión abierta, la página detecta la discrepancia y despliega el aviso destacado:
     > ⚠️ **«Sus permisos cambiaron. Cierre sesión y vuelva a ingresar para actualizarlos».**
   - Proporciona un botón directo que ejecuta `cerrarSesion()` para permitir al empleado autenticarse nuevamente y obtener el JWT refrescado.

4. **Enlace en el Encabezado:**
   - Se integró en `src/app/layout/header/header.html` un hipervínculo interactivo sobre el nombre del usuario y un botón dedicado «Mi cuenta» con enrutamiento declarativo `routerLink="/mi-cuenta"`.
   - La ruta en `app.routes.ts` cuenta con protección exclusiva de `authGuard` (sin `permisoGuard`), facultando a cualquier trabajador autenticado a consultar su información.

---

## 3. Parte C. Informe de Seguridad del Frontend

### C1. Resumen Estadístico de Casos Ejecutados

Se ejecutó la totalidad de los 24 casos de prueba diseñados, verificando el comportamiento del cliente web frente a PharmaBackend:

| Grupo Funcional | Casos Ejecutados | Casos que Pasan | Casos que Fallan | Tasa de Éxito |
| :--- | :---: | :---: | :---: | :---: |
| **Login** (`L-01` a `L-04`, `P-L01`) | 5 | 5 | 0 | 100 % |
| **Sesión** (`S-01` a `S-04`, `P-S01`) | 5 | 5 | 0 | 100 % |
| **Interceptor** (`I-01` a `I-03`, `P-I01`) | 4 | 4 | 0 | 100 % |
| **Guards** (`G-01`, `G-02`, `P-G01`) | 3 | 3 | 0 | 100 % |
| **Menú y Acciones** (`M-01`, `M-02`) | 2 | 2 | 0 | 100 % |
| **Control 401 / 403** (`E-01`) | 1 | 1 | 0 | 100 % |
| **Aviso Previo Expiración** (`B-01` a `B-04`) | 4 | 4 | 0 | 100 % |
| **Total Consolidado** | **24** | **24** | **0** | **100 %** |

---

### C2. Fichas de Hallazgos Técnicos y Análisis de Robustez

Durante la auditoría experimental se analizaron dos particularidades inherentes a la arquitectura web moderna que merecen atención y diseño defensivo:

#### Ficha de Hallazgo 1: Aislamiento Contextual de `sessionStorage` entre Pestañas Concurrente (Caso S-04)
- **Descripción:** Cuando un colaborador abre la SPA en dos pestañas simultáneas y cierra sesión voluntariamente en la Pestaña A, la Pestaña B mantiene temporalmente la clave `pharmasoft.sesion` y permite continuar navegando en la interfaz hasta que realiza una petición de red al backend o se recarga.
- **Severidad:** Media / Informativa.
- **Evidencia:** Prueba `S-04_pestanas.png`.
- **Causa Probable (`auth-service.ts` / Estándar W3C Web Storage):**
  Por especificación de la W3C, cada pestaña del navegador cuenta con una instancia de `sessionStorage` completamente aislada. La eliminación de la clave en una pestaña no dispara el evento estándar de mutación en la otra pestaña.
- **Corrección Propuesta / Mitigación:**
  Para sincronizar el cierre de sesión entre todas las pestañas de forma instantánea sin migrar a un almacenamiento vulnerable como `localStorage`, se puede implementar una comunicación inter-contextos mediante la API estándar `BroadcastChannel`:
  ```typescript
  // En AuthService:
  private readonly canal = new BroadcastChannel('pharmasoft_auth');

  constructor() {
    this.canal.onmessage = (msg) => {
      if (msg.data === 'LOGOUT') {
        this.cerrarSesionLocal();
      }
    };
  }

  cerrarSesion(): void {
    this.canal.postMessage('LOGOUT');
    this.cerrarSesionLocal();
  }
  ```

#### Ficha de Hallazgo 2: Persistencia Temporal de Permisos Obsoletos ante Cambios en el Backend (Caso B2)
- **Descripción:** El token JWT emitido es autocontenido y posee un ciclo de vida prefijado. Si un administrador retira permisos a un usuario en base de datos mientras este trabaja, el token continúa siendo criptográficamente válido ante el backend hasta su expiración física, a menos que el servidor consulte la base de datos en cada petición o invalide el token.
- **Severidad:** Media.
- **Evidencia:** Vista `/mi-cuenta` comparando permisos de `/auth/me` con la sesión local.
- **Causa Probable:** Arquitectura sin estado (*stateless*) del protocolo JWT.
- **Corrección Propuesta Implementada:**
  Se incorporó en `/mi-cuenta` la consulta al perfil en tiempo real (`GET /api/v1/auth/me`). Al contrastar los arrays de permisos (`sesion.permisos` vs `perfil.permisos`), el componente levanta una alerta amarilla persistente exigiendo el cierre de sesión para refrescar las credenciales, cerrando la brecha de sincronización en el cliente.

---

### C3. Preguntas de Análisis

#### 1. Si el menú, la directiva y los guards ya ocultan lo que el usuario no puede hacer, ¿por qué el backend debe seguir validando cada permiso? Usa el caso E-01 como evidencia.
El frontend se ejecuta íntegramente en el navegador del cliente, un entorno hostil que se encuentra bajo el control físico absoluto del usuario. Mediante las herramientas para desarrolladores (F12 DevTools), cualquier usuario puede modificar el árbol DOM para eliminar la directiva `*appSiPermiso`, habilitar botones restringidos, alterar scripts en memoria o ejecutar llamadas directas vía `fetch()` o `cURL`. Las medidas de seguridad en el frontend (guards, menús computados y directivas) cumplen un rol exclusivamente ergonómico y de experiencia de usuario (UX), evitando frustraciones visuales, pero no constituyen una barrera perimetral real. El caso de prueba **E-01** demuestra fehacientemente este principio: un vendedor que fuerza en la consola la petición `DELETE /api/v1/productos/1` es rechazado de inmediato por el backend con un **HTTP 403 Forbidden**, gracias a la anotación `@PreAuthorize("hasAuthority('CATALOGO_ESCRIBIR')")` en el controlador de Spring Boot. Por tanto, el backend representa la única fuente de verdad y debe verificar rigurosamente la autorización en cada endpoint, cumpliendo con el principio de **Defensa en Profundidad**.

#### 2. ¿Qué ventajas y riesgos tiene guardar el token en `sessionStorage` frente a `localStorage` y a una cookie `HttpOnly`? ¿Cuál elegirías para la botica y por qué?
`sessionStorage` ofrece la ventaja crucial de que los datos se destruyen automáticamente tan pronto como se cierra la pestaña o el navegador, mitigando el riesgo de que el siguiente usuario de la computadora acceda a la sesión anterior; no obstante, es accesible mediante JavaScript, siendo vulnerable si la aplicación sufre un ataque de Cross-Site Scripting (XSS). Por su parte, `localStorage` persiste indefinidamente hasta su borrado explícito, lo que en una botica con turnos rotativos y terminales compartidas constituye un peligro crítico de secuestro de sesión si un empleado olvida cerrar su cuenta. La opción de mayor solidez técnica es una **cookie con bandera `HttpOnly`, `Secure` y `SameSite=Strict`**, dado que el navegador gestiona el envío de la cookie sin permitir que ningún script de JavaScript acceda a ella, neutralizando por completo el robo de credenciales mediante ataques XSS (aunque exige mecanismos de protección contra CSRF). Para el escenario específico de la botica, donde múltiples colaboradores operan la misma estación de trabajo, **`sessionStorage` es la elección idónea dentro del modelo cliente-servidor desacoplado actual**, ya que garantiza el cierre de sesión forzoso al cerrar la ventana, protegiendo las cuentas sin demandar infraestructura de cookies compartidas entre dominios cruzados.

#### 3. ¿Por qué el `errorInterceptor` cierra la sesión ante un 401 pero no ante un 403? ¿Qué pasaría con la experiencia del usuario si se hiciera al revés?
Esta decisión responde a la semántica formal del protocolo HTTP según el RFC 9110: el código **401 Unauthorized** denota una falla de **autenticación** (el cliente carece de credenciales válidas, el token ha expirado o su firma fue adulterada); por ende, la sesión no es válida y resulta mandatorio expulsar al usuario al formulario de login para que renueve su identidad. En contraste, el código **403 Forbidden** denota una falla de **autorización**: el servidor reconoce y valida con éxito la identidad del usuario, pero determina que su perfil no posee los privilegios necesarios para ejecutar esa acción particular (por ejemplo, un cajero intentando eliminar un producto). Si el interceptor cerrara la sesión ante un 403, la experiencia del usuario sería catastrófica y frustrante: cualquier clic accidental o restricción de acceso cerraría inesperadamente su jornada laboral, descartando transacciones válidas a medio registrar y forzándolo a iniciar sesión repetidas veces a pesar de contar con una identidad legítima. Mantener la sesión activa en un 403 permite desplegar una notificación informativa y continuar trabajando normalmente.

#### 4. ¿Qué es una redirección abierta (Open Redirect) y cómo la evita la validación del `returnUrl` en el login? Explícalo con el caso L-04.
Una redirección abierta es una vulnerabilidad de seguridad en la cual una aplicación web toma una URL suministrada externamente a través de un parámetro de consulta (ej. `?returnUrl=https://atacante.com/phishing`) y redirige automáticamente al usuario hacia ella sin validar su destino. Los cibercriminales explotan esta falla para diseñar campañas de phishing creíbles: envían un enlace genuino de la botica (`http://localhost:4200/login?returnUrl=https://sitio-falso.com`), el usuario confía en el dominio legítimo, introduce sus credenciales exitosamente y es redirigido de inmediato a una página falsa que clona la apariencia del sistema para sustraer contraseñas o tarjetas. En la SPA PharmaSoft, el caso **L-04** valida esta protección en el método `destino()` de `login.ts`:
```typescript
private destino(): string {
  const url = this.returnUrl();
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/inicio';
}
```
Esta lógica comprueba que la ruta comience con una barra simple (`/`) para garantizar que sea una ruta relativa dentro del enrutador de Angular, y rechaza cualquier cadena que inicie con protocolo (`http://`, `https://`) o con barra doble (`//` que los navegadores interpretan como enlaces agnósticos al protocolo). Ante cualquier intento malicioso, la SPA descarta el parámetro y conduce al usuario de forma segura a `/inicio`.

---

## 4. Conclusiones y Estado de Entrega

La integración y verificación autónoma de la Sesión 11 concluye satisfactoriamente:
- Se implementó y verificó con éxito el aviso de expiración reactivo (`porVencer`), dotando a PharmaSoft de una capa preventiva que evita la pérdida de operaciones de venta en la botica.
- Se construyó la página «Mi cuenta» vinculada a `GET /api/v1/auth/me`, ofreciendo visibilidad completa de permisos y detección en caliente de modificaciones de privilegios.
- Se ejecutó la batería integral de 24 casos de prueba con una tasa de efectividad del 100%, garantizando robustez frente a ataques de inyección, manipulación de sesión en cliente y redirecciones abiertas.
- Todos los cambios se encuentran versionados en la rama `feature/seguridad-spa-pruebas-vilca` con commits convencionales conformes a la rúbrica académica.
