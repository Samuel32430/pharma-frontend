# PharmaFrontend

Frontend del sistema integral de farmacia **PharmaSoft**, desarrollado con **Angular 22** (Standalone Components, Signals, Deferrable Views `@defer`, Vite/esbuild) y empaquetado para producción con **Nginx 1.27 Alpine**.

---

## Despliegue en producción

### 1. Diagrama de la Arquitectura

```text
+-------------------------------------------------------+
|             Navegadores Web / Terminales POS          |
|                 (Sucursal 1, 2 y 3)                   |
+---------------------------+---------------------------+
                            |
                            | HTTP / HTTPS (Puerto 8081 / 443)
                            v
+-------------------------------------------------------+
|                  Nginx 1.27 Alpine                    |
|              (Servidor Web & Proxy Inverso)           |
|  - Archivos SPA estáticos con hash inmutables (1 año) |
|  - index.html revalidado siempre (no-cache)           |
|  - Proxy inverso hacia el API: /api/*                 |
+---------------------------+---------------------------+
                            |
                            | HTTP Interno (Puerto 8080)
                            v
+-------------------------------------------------------+
|                    PharmaBackend                      |
|            (Spring Boot 4 · Java 21 LTS)              |
|  - Filtro MDC con RequestId (X-Request-Id)            |
|  - Endpoints protegidos con JWT y roles RBAC          |
|  - Endpoints de Actuator (/health, /metrics)          |
+---------------+-----------------------+---------------+
                |                       |
                | Puerto 1521 (SQL/TCP) | Puerto 6379 (RESP)
                v                       v
+-------------------------------+   +-------------------------------+
|      Oracle Database 23ai     |   |         Redis 7 Alpine        |
|    (Persistencia Principal)   |   |   (Caché en Memoria y TTL)    |
+-------------------------------+   +-------------------------------+
```

### 2. Variables de Entorno y Configuración de Despliegue

| Variable / Archivo | Propósito | Valor en Producción |
| :--- | :--- | :--- |
| `deploy/nginx.conf` | Configuración de servidor web, compresión gzip y directivas de caché | Montado como volumen en `/etc/nginx/conf.d/default.conf` |
| `deploy/docker-compose.yml` | Orquestación de contenedores Nginx y Redis | Puerto mapeado `8081:80` para web y `6379:6379` para Redis |
| `API_URL` | Destino del proxy inverso en Nginx | `http://backend:8080` (vía `host-gateway`) |
| `PORT` | Puerto de escucha expuesto para la intranet de la botica | `8081` (o `443` con TLS) |

### 3. Pasos para Construir, Desplegar y Rollback

#### Construcción y Despliegue
1. Instalar dependencias exactas y compilar en modo optimizado de producción:
   ```bash
   npm ci
   npm run build
   ```
2. Levantar el servicio Nginx con Docker Compose:
   ```bash
   docker compose -f deploy/docker-compose.yml up -d --build web
   ```
3. Verificar la disponibilidad del sitio ingresando a `http://localhost:8081/`.

#### Procedimiento de Rollback (Vuelta Atrás)
1. Si un despliegue presenta incidencias en la interfaz o rotura de assets:
   ```bash
   # Revertir a la versión anterior de la compilación
   rm -rf dist/pharma-frontend/browser
   cp -r dist/pharma-frontend/browser-backup dist/pharma-frontend/browser
   # Recargar Nginx sin reiniciar el contenedor
   docker exec $(docker compose -f deploy/docker-compose.yml ps -q web) nginx -s reload
   ```
2. Gracias a que `index.html` tiene política `no-cache`, los usuarios verán la versión anterior revertida de inmediato sin vaciar su almacenamiento local.

### 4. Lista de Buenas Prácticas de la Sesión

| N.º | Buena Práctica Evaluada | Estado en PharmaSoft | Acción Pendiente / Justificación |
| :---: | :--- | :---: | :--- |
| 1 | Carga diferida de rutas (`Lazy Loading`) | **Cumple** | Rutas modularizadas bajo demanda con `loadComponent` y `loadChildren`. |
| 2 | Componentes pesados diferidos (`@defer`) | **Cumple** | Reporte de más vendidos y componente de aviso de sesión diferidos con `@defer`. |
| 3 | Presupuestos estrictos de tamaño (*budgets*) | **Cumple** | Límites configurados en `angular.json` (warning 350 kB, error 400 kB). |
| 4 | Políticas de caché en Nginx | **Cumple** | `index.html` revalidado (`no-cache`), estáticos con hash inmutables a 1 año. |
| 5 | Prevención de caché del navegador en API REST | **Cumple** | Spring Security inyecta cabeceras `no-cache, no-store, max-age=0, must-revalidate`. |
| 6 | Caché distribuida en memoria con Redis | **Cumple** | Implementado para categorías y productos con serialización JSON. |
| 7 | Tolerancia a fallos de caché (*Fallback*) | **Cumple** | `CacheErrorHandler` en `CacheConfig` redirige consultas a Oracle si Redis cae. |
| 8 | Invalidación estricta con `@CacheEvict` | **Cumple** | `@CacheEvict(allEntries=true)` en creación, edición, borrado y registro de ventas. |
| 9 | Trazabilidad correlacionada con `X-Request-Id` | **Cumple** | Filtro de entrada inyecta UUID en MDC, logs y cabecera HTTP de respuesta. |
| 10 | Inclusión de `requestId` en respuestas de error | **Cumple** | Interceptor y utilidad `mensajeError` muestran el código de seguimiento al usuario. |
| 11 | Auditoría de confidencialidad en logs | **Cumple** | Logs limpios de contraseñas, tokens JWT completos y secretos. |
| 12 | Endpoints de salud y métricas asegurados | **Cumple** | `/actuator/health` y `/actuator/metrics` protegidos bajo autorización de rol ADMIN. |

### 5. Recomendaciones Priorizadas para los 3 Locales de la Botica

1. **Cifrado TLS/HTTPS en el Frontend y Terminación SSL:**
   Configurar certificados TLS (Let's Encrypt o certificado corporativo) en Nginx. Dado que los tres locales operan a través de enlaces de red externos, el cifrado extremo a extremo es mandatorio para proteger las credenciales de los empleados y los datos personales y de salud de los clientes.
2. **Instancia Centralizada de Redis con Replicación y Persistencia (AOF/RDB):**
   Las tres sucursales deben operar sobre el mismo catálogo de productos y precios. Se recomienda desplegar un único servidor Redis central con persistencia activa (Append-Only File) para asegurar que una venta realizada en el Local 1 descuente el stock e invalide la caché de inmediato para los Locales 2 y 3.
3. **Monitoreo Proactivo y Alertas Tempranas con Actuator:**
   Integrar un sistema de sondeo automático (ej. Prometheus o Uptime Kuma) que consulte periódicamente `/actuator/health`. En caso de que el componente de base de datos o Redis pase a estado `DOWN`, el sistema debe enviar una notificación inmediata (Slack/Telegram) al administrador antes de que los cajeros reporten la incidencia.
