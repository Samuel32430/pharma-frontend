# Informe Técnico de Hallazgos: Dependencias entre Categorías y Productos

**Universidad Peruana Unión (UPeU)**  
*Facultad de Ingeniería y Arquitectura · EP Ingeniería de Sistemas*  
**Curso:** Lenguaje de Programación II · Ciclo IV · Semestre 2026-2  
**Actividad Autónoma — Sesión 8:** Pruebas de dependencias entre Categorías y Productos  

---

## Metadatos de la Entrega

- **Estudiante:** Samuel Vilca
- **Docente:** Reyna Barreto Benjamin David
- **Repositorio Git:** `pharma-frontend`
- **Rama de Trabajo:** `feature/pruebas-dependencias-vilca`
- **Solicitud de Incorporación (Pull Request):** Rama `feature/pruebas-dependencias-vilca` hacia `develop`
- **Colección de Postman:** `postman/PharmaSoft-S8-Dependencias.json`
- **Fecha:** Octubre 2026

---

## B1. Resumen de la Ejecución

Se diseñó y ejecutó una batería integral de **18 casos de prueba** divididos en tres grupos operativos (Altas, Cambios y Bajas). Las pruebas se aplicaron tanto desde la interfaz de usuario reactiva (SPA en Angular 22) como directamente contra los endpoints de la API REST (`PharmaBackend` en Spring Boot 3) empleando **Postman**, con el objetivo de evaluar la robustez de las reglas de integridad referencial y dependencias entre tablas.

### Resumen Estadístico de Pruebas

| Grupo de Operaciones | Total Casos | Casos que Pasan | Casos que Fallan (Hallazgos) | Tasa de Conformidad |
| :--- | :---: | :---: | :---: | :---: |
| **Altas (Creación de Productos)** | 8 | 7 | 1 | 87.5 % |
| **Cambios (Actualización y Edición)** | 5 | 3 | 2 | 60.0 % |
| **Bajas (Eliminación y Desactivación)** | 5 | 5 | 0 | 100.0 % |
| **TOTAL GENERAL** | **18** | **15** | **3** | **83.3 %** |

- **Altas:** 8 casos ejecutados (A-01 a A-06 base + A-07 y A-08 propios). Falló **A-04**, donde la API permite persistir productos en categorías inactivas.
- **Cambios:** 5 casos ejecutados (C-01 a C-04 base + C-05 propio). Fallaron **C-02** y **C-04**, dado que la API permite asociar productos a categorías inactivadas o que fueron desactivadas concurrentemente.
- **Bajas:** 5 casos ejecutados (B-01 a B-04 base + B-05 propio). Todos pasaron de acuerdo a las reglas de negocio establecidas para preservar el historial transaccional de ventas.

---

## B2. Fichas de Hallazgos

### Ficha de Hallazgo H-01

- **ID del Hallazgo:** H-01
- **Caso Relacionado:** A-04 (Registrar producto en categoría inactiva)
- **Descripción del Problema:**  
  La regla de negocio establece que un producto **nunca** debe pertenecer a una categoría inactiva. Mientras que la SPA oculta las categorías inactivas en el formulario de alta impidiendo que el usuario las seleccione, si un cliente o atacante realiza una petición `POST /api/v1/productos` mediante Postman enviando el ID de una categoría con `estado: false`, la API REST procesa la solicitud, la valida como exitosa y responde con **`201 Created`**, persistiendo el producto en la base de datos vinculado a una categoría deshabilitada.
- **Severidad:** **Alta** *(Genera inconsistencia de datos y evasión de reglas de negocio por falta de validación en el backend).*
- **Evidencia Visual:**  
  > 📷 **[ESPACIO PARA CAPTURA DE POSTMAN: `A-04_postman.png`]**  
  > *(Petición POST con `categoriaId: 3` [Vitaminas inactiva] mostrando código de estado 201 Created y el cuerpo JSON del producto creado).*
- **Causa Probable:**  
  En el archivo backend [`ProductoServiceImpl.java`](file:///c:/Users/samue/Downloads/PharmaBackend/PharmaBackend/src/main/java/pe/edu/upeu/PharmaBackend/service/impl/ProductoServiceImpl.java#L40), dentro del método `guardar()`, únicamente se valida la existencia física del registro en la base de datos mediante `catergoriaRepository.findById(t.getCategoriaId())`, pero **no se comprueba el estado lógico** de la entidad `Categoria` obtenida (`categoria.getEstado()`).
- **Corrección Propuesta (Backend - Capa de Servicio):**  
  Agregar la validación explícita del estado de la categoría en `ProductoServiceImpl.java`:
  ```java
  Categoria categoria = catergoriaRepository.findById(t.getCategoriaId())
          .orElseThrow(() -> new RecursoNoEncontradoException("La categoria no se encontró"));

  if (Boolean.FALSE.equals(categoria.getEstado())) {
      log.warn("Rechazo de registro: La categoría con ID {} está inactiva", t.getCategoriaId());
      throw new ReglaNegocioException("No se puede registrar un producto en una categoría inactiva");
  }
  ```

---

### Ficha de Hallazgo H-02

- **ID del Hallazgo:** H-02
- **Caso Relacionado:** C-02 (Cambiar la categoría de un producto a una inactiva)
- **Descripción del Problema:**  
  Al actualizar un producto existente mediante `PUT /api/v1/productos/{id}`, la regla exige impedir que el producto sea reasignado a una categoría inactiva. En la interfaz web, el selector de edición no ofrece categorías inactivas ajenas. Sin embargo, al invocar directamente el endpoint PUT por Postman con el ID de una categoría inactiva, la API acepta la modificación respondiendo **`200 OK`**, corrompiendo la clasificación del catálogo.
- **Severidad:** **Alta** *(Permite vulnerar la integridad de los datos en operaciones de modificación).*
- **Evidencia Visual:**  
  > 📷 **[ESPACIO PARA CAPTURA DE POSTMAN: `C-02_postman.png`]**  
  > *(Petición PUT `/api/v1/productos/1` con `categoriaId: 3` mostrando código 200 OK y la categoría inactiva vinculada).*
- **Causa Probable:**  
  En [`ProductoServiceImpl.java`](file:///c:/Users/samue/Downloads/PharmaBackend/PharmaBackend/src/main/java/pe/edu/upeu/PharmaBackend/service/impl/ProductoServiceImpl.java#L73), en el método `actualizar()`, se recupera la categoría con `catergoriaRepository.findById()` pero se omite verificar si `categoria.getEstado()` es verdadero antes de reasignarla al producto.
- **Corrección Propuesta (Backend - Capa de Servicio):**  
  Incorporar en `ProductoServiceImpl.java`:
  ```java
  if (Boolean.FALSE.equals(categoria.getEstado())) {
      log.warn("Rechazo de actualización: La categoría de destino ID {} está inactiva", t.getCategoriaId());
      throw new ReglaNegocioException("No se puede asignar un producto a una categoría inactiva");
  }
  ```

---

### Ficha de Hallazgo H-03

- **ID del Hallazgo:** H-03
- **Caso Relacionado:** C-04 (Concurrencia en dos pestañas del navegador)
- **Descripción del Problema:**  
  En un escenario concurrente:
  1. En la Pestaña 1, el usuario abre el formulario "Nuevo producto" y selecciona la categoría *«Analgésicos»* (que en ese instante está activa).
  2. En la Pestaña 2, otro usuario edita la categoría *«Analgésicos»* y la desactiva (`estado: false`).
  3. El usuario de la Pestaña 1 completa el formulario y presiona "Registrar".
  Dado que la validación solo existía en el cliente al momento de cargar el select, la SPA envía el POST y el backend procesa la solicitud respondiendo **`201 Created`**, dejando un producto nuevo en una categoría que ya estaba inactiva.
- **Severidad:** **Media / Alta** *(Condición de carrera que afecta la consistencia en entornos multiusuario).*
- **Evidencia Visual:**  
  > 📷 **[ESPACIO PARA CAPTURA DE LA SPA: `C-04_spa.png`]**  
  > *(Pantallas simultáneas demostrando la persistencia exitosa a pesar de la desactivación concurrente de la categoría).*
- **Causa Probable:**  
  Falta de validación atómica en el backend al momento de procesar la transacción. La interfaz de usuario opera con un estado local en memoria desactualizado (*stale state*).
- **Corrección Propuesta (Backend):**  
  Al aplicar la corrección de **H-01** en la capa de servicio del backend dentro de la transacción `@Transactional`, el backend consultará el estado actual en la base de datos al momento exacto de persistir, rechazando el registro con `409 Conflict`. La SPA capturará este error y mostrará la alerta descriptiva al usuario.

---

## B3. Cobertura de Reglas de Negocio

La siguiente matriz detalla en qué capa del sistema se hace cumplir efectivamente cada regla de integridad y dependencia:

| Regla de Negocio / Dependencia | Dónde se valida hoy | Detalle del Comportamiento Actual |
| :--- | :---: | :--- |
| **Existencia de la Categoría** | **Ambas** (SPA + API) | La SPA solo permite seleccionar opciones cargadas del backend; la API retorna `404 Not Found` ante un `categoriaId` inexistente. |
| **Categoría Activa en Altas** | **Solo SPA** | La SPA filtra el select para mostrar solo activas. La API no valida el estado y acepta categorías inactivas (**Hallazgo H-01**). |
| **Categoría Activa en Cambios** | **Solo SPA** | La SPA bloquea el guardado si la categoría actual está inactiva (`categoriaInactiva()`). La API acepta cambios a categorías inactivas (**Hallazgo H-02**). |
| **Nombre de Producto Único** | **Ambas** (SPA + API) | La API valida `existsByNombreIgnoreCase` y `existsByNombreIgnoreCaseAndIdNot` devolviendo `409 Conflict`; la SPA captura el error y muestra la alerta en rojo. |
| **Precios y Stocks Válidos** | **Ambas** (SPA + API) | La SPA aplica validadores síncronos reactivos (`Validators.min(0.01)`, `Validators.min(0)`); la API ejecuta validaciones Bean Validation (`@DecimalMin`, `@Min`) respondiendo `400 Bad Request`. |
| **No eliminar categoría con productos** | **Solo API** | La API valida `existsByCategoriaId` en `CategoriaServiceImpl.java` devolviendo `409 Conflict`; la SPA muestra la alerta superior impidiendo el borrado. |
| **Baja lógica de Producto** | **Ambas** (SPA + API) | La SPA deshabilita el botón de baja en productos inactivos; la API verifica `Boolean.FALSE.equals(producto.getEstado())` y rechaza bajas repetidas con `409 Conflict`. |

---

## B4. Recomendación sobre el Filtro por Categoría

### Diagnóstico del Filtro Actual
Actualmente, el filtro por categoría en `ProductoList` ([`producto-list.ts`](file:///c:/Users/samue/Downloads/PharmaBackend/pharma-frontend/src/app/features/productos/pages/producto-list/producto-list.ts#L31-L35)) está implementado como una señal computada en memoria del cliente:
```typescript
protected readonly productos = computed(() => {
  const filtro = this.categoriaFiltro();
  const lista = this.resultado()?.contenido ?? [];
  return filtro === null ? lista : lista.filter(p => p.categoriaId === filtro);
});
```
**Limitación:** El filtro solo evalúa sobre los 10 registros presentes en la página actual (`this.resultado()?.contenido`). Si existen 50 productos de la categoría *«Antibióticos»* repartidos en las páginas 2, 3 y 4, la primera página solo mostrará los pocos que coincidan localmente, dando la falsa impresión de que no existen más registros.

### Propuesta de Solución Integral en Backend y Frontend

Para que el filtrado se realice a nivel global sobre la totalidad de la base de datos manteniendo la paginación del servidor:

1. **En el Repositorio del Backend ([`ProductoRepository.java`](file:///c:/Users/samue/Downloads/PharmaBackend/PharmaBackend/src/main/java/pe/edu/upeu/PharmaBackend/repository/ProductoRepository.java)):**  
   Declarar una consulta derivada que soporte paginación por categoría:
   ```java
   Page<Producto> findByCategoriaId(Long categoriaId, Pageable pageable);
   ```
2. **En el Controlador y Servicio del Backend ([`ProductoController.java`](file:///c:/Users/samue/Downloads/PharmaBackend/PharmaBackend/src/main/java/pe/edu/upeu/PharmaBackend/controller/ProductoController.java)):**  
   Agregar el parámetro opcional `@RequestParam(required = false) Long categoriaId`:
   ```java
   @GetMapping
   public ResponseEntity<PaginaResponseDTO<ProductoResponseDTO>> listar(
           @RequestParam(defaultValue = "0") int pagina,
           @RequestParam(defaultValue = "10") int tamanio,
           @RequestParam(defaultValue = "nombre") String ordenarPor,
           @RequestParam(defaultValue = "asc") String direccion,
           @RequestParam(required = false) Long categoriaId) {
       return ResponseEntity.ok(
               productoService.listarPaginado(pagina, tamanio, ordenarPor, direccion, categoriaId)
       );
   }
   ```
   En `ProductoServiceImpl`: si `categoriaId` no es nulo, invocar `productoRepository.findByCategoriaId(categoriaId, pageable)`; en caso contrario, invocar `findAll(pageable)`.
3. **En el Servicio del Frontend ([`ProductoService.ts`](file:///c:/Users/samue/Downloads/PharmaBackend/pharma-frontend/src/app/features/productos/services/producto-service.ts)):**  
   Extender `listar()` para incluir `categoriaId?: number | null`:
   ```typescript
   listar(pagina: number, tamanio: number, ordenarPor: OrdenProducto, direccion: Direccion, categoriaId?: number | null): Observable<PaginaResponse<Producto>> {
     let params = new HttpParams()
       .set('pagina', pagina)
       .set('tamanio', tamanio)
       .set('ordenarPor', ordenarPor)
       .set('direccion', direccion);
     if (categoriaId) {
       params = params.set('categoriaId', categoriaId);
     }
     return this.http.get<PaginaResponse<Producto>>(this.url, { params });
   }
   ```

---

## B5. Preguntas de Análisis

### 1. ¿Por qué no basta con que la SPA oculte las categorías inactivas? Relaciónalo con tus casos A-04 y C-02.
No basta porque la interfaz de usuario es un cliente abierto y manipulable que no constituye una barrera de seguridad: cualquier cliente externo (como Postman, scripts automatizados o aplicaciones móviles) puede emitir peticiones HTTP directamente contra la API REST sin pasar por las restricciones visuales de Angular. Los casos **A-04** y **C-02** demostraron empíricamente esta vulnerabilidad: a pesar de que la SPA no mostraba la categoría inactiva en el select, las peticiones POST y PUT enviadas por Postman con `categoriaId: 3` respondieron con códigos exitosos `201 Created` y `200 OK`, corrompiendo la base de datos con registros asociados a categorías deshabilitadas debido a la ausencia de validación en [`ProductoServiceImpl.java`](file:///c:/Users/samue/Downloads/PharmaBackend/PharmaBackend/src/main/java/pe/edu/upeu/PharmaBackend/service/impl/ProductoServiceImpl.java).

### 2. Cuando se desactiva una categoría con productos activos (C-03), ¿qué debería pasar con esos productos: impedir la desactivación, desactivarlos también o permitirlo con una advertencia? Justifica tu decisión pensando en las ventas.
La decisión técnica y de negocio óptima es **permitir la desactivación pero emitiendo una advertencia explícita al usuario**: no se deben desactivar automáticamente los productos asociados porque estos pueden contar con stock físico en almacén y ventas en curso en caja que no deben interrumpirse abruptamente. Sin embargo, la categoría debe quedar bloqueada para impedir la creación de *nuevos* productos o compras futuras en ella, preservando así la continuidad operativa del negocio y la integridad de las transacciones ya iniciadas sin provocar pérdidas comerciales innecesarias.

### 3. En B-04, el backend cuenta también los productos dados de baja al decidir si una categoría se puede eliminar. ¿Estás de acuerdo? ¿Qué pasaría con los reportes de ventas si se permitiera eliminarla?
**Sí, estoy totalmente de acuerdo con la regla del backend**: una categoría que tiene productos asociados (incluso si todos están dados de baja lógica con `estado: false`) no debe eliminarse físicamente de la base de datos (`existsByCategoriaId` en [`CategoriaServiceImpl.java#L107`](file:///c:/Users/samue/Downloads/PharmaBackend/PharmaBackend/src/main/java/pe/edu/upeu/PharmaBackend/service/impl/CategoriaServiceImpl.java#L107)). Si se permitiera borrarla físicamente mediante `DELETE`, se violaría la clave foránea (`FOREIGN KEY`) en la tabla `producto` o, en caso de eliminación en cascada (`ON DELETE CASCADE`), se destruirían los productos y las líneas de venta históricas en `detalle_venta`, arruinando irreversibly los reportes financieros de ventas, auditorías contables y estadísticas anuales de ingresos por categoría.

### 4. ¿Qué revela el caso C-04 sobre el momento en que se validan las dependencias? ¿Qué capa es la única que puede resolverlo?
El caso **C-04** revela que las dependencias **no pueden validarse únicamente en el momento de renderizar la interfaz**, ya que existe una brecha temporal (*race condition*) entre el instante en que el formulario web carga las opciones y el momento posterior en que el usuario presiona "Guardar". En sistemas concurrentes y multiusuario, el estado del negocio puede mutar durante esa ventana de tiempo; por consiguiente, **la capa de Servicio del Backend (API REST) es la única capaz de resolverlo de forma definitiva**, debido a que ejecuta las validaciones dentro de una transacción transaccional atómica (`@Transactional`) contra el estado real y consolidado de la base de datos en el milisegundo exacto de la persistencia.

### 5. Si mañana el backend corrige el hallazgo de A-04, ¿qué tendría que cambiar en la SPA? ¿Y qué seguiría igual?
En la SPA **no tendría que cambiar prácticamente nada en la lógica del formulario**, ya que `ProductoForm` ([`producto-form.ts`](file:///c:/Users/samue/Downloads/PharmaBackend/pharma-frontend/src/app/features/productos/pages/producto-form/producto-form.ts#L105-L109)) ya cuenta con la captura genérica de excepciones `HttpErrorResponse` y extrae los mensajes mediante `mensajeError(err)` y `erroresServidor()`. Lo que seguiría exactamente igual es la experiencia de usuario estándar (el select continuaría listando únicamente categorías activas); la única diferencia en la SPA sería que, en el caso de que una categoría se desactive concurrentemente o se fuerce un envío anómalo, la SPA ahora recibiría un código HTTP `409 Conflict` y mostrará de manera automática la alerta roja superior con el mensaje: *"No se puede registrar un producto en una categoría inactiva"*, protegiendo la coherencia del sistema sin requerir refactorizaciones en la interfaz.

---

## B6. Espacios Asignados para Evidencias y Capturas de Pantalla

Para la entrega final del informe en formato PDF, se han dispuesto los siguientes recuadros donde se deben insertar las capturas correspondientes:

---

### Captura 1: Caso A-01 (Registro Válido en SPA)
> 📷 **Insertar aquí: `A-01_spa.png`**  
> *Descripción: Formulario de nuevo producto completado con categoría activa, seguido de la tabla donde se muestra la nueva fila agregada y la pestaña Red de F12 con la llamada `POST /api/v1/productos` (201 Created).*

---

### Captura 2: Caso A-02 (Validación Local y en Postman)
> 📷 **Insertar aquí: `A-02_spa.png` y `A-02_postman.png`**  
> *Descripción: Formulario de la SPA mostrando el mensaje rojo «Seleccione la categoría del producto» con la pestaña Red vacía; y la captura de Postman con POST sin campo `categoriaId` respondiendo 400 Bad Request.*

---

### Captura 3: Caso A-03 (Categoría Inexistente en Postman)
> 📷 **Insertar aquí: `A-03_postman.png`**  
> *Descripción: Petición POST en Postman con `categoriaId: 999` mostrando la respuesta HTTP 404 Not Found con el mensaje «La categoria no se encontró».*

---

### Captura 4: Caso A-04 (Hallazgo H-01 en Postman)
> 📷 **Insertar aquí: `A-04_postman.png`**  
> *Descripción: Petición POST en Postman enviando `categoriaId: 3` (categoría inactiva) evidenciando la respuesta errónea 201 Created y el producto registrado.*

---

### Captura 5: Caso A-05 (Nombre Duplicado en SPA)
> 📷 **Insertar aquí: `A-05_spa.png`**  
> *Descripción: Formulario de producto en la SPA mostrando la alerta roja superior «Ya existe un producto con el nombre...» (HTTP 409 Conflict).*

---

### Captura 6: Caso A-06 (Validación de Precio y Stock)
> 📷 **Insertar aquí: `A-06_spa.png` y `A-06_postman.png`**  
> *Descripción: SPA resaltando campos precio y stock en rojo; y petición en Postman con precio 0 y stock -1 mostrando respuesta 400 Bad Request con el arreglo de `validationErrors`.*

---

### Captura 7: Caso C-01 (Actualización de Categoría en SPA)
> 📷 **Insertar aquí: `C-01_spa.png`**  
> *Descripción: Pantalla de edición cambiando la categoría de un producto a otra activa y visualización del listado actualizado con la nueva categoría.*

---

### Captura 8: Caso C-02 (Hallazgo H-02 en Postman)
> 📷 **Insertar aquí: `C-02_postman.png`**  
> *Descripción: Petición PUT en Postman asignando una categoría inactiva y recibiendo respuesta 200 OK en lugar de 409 Conflict.*

---

### Captura 9: Caso C-04 (Carrera Concurrente en Dos Pestañas)
> 📷 **Insertar aquí: `C-04_spa.png`**  
> *Descripción: Dos pestañas del navegador abiertas en paralelo: la primera guardando un producto con categoría activa y la segunda mostrando la categoría recién desactivada.*

---

### Captura 10: Caso B-01 (Baja Lógica de Producto en SPA)
> 📷 **Insertar aquí: `B-01_spa.png`**  
> *Descripción: Listado de productos tras hacer clic en «Dar de baja», mostrando la fila con badge gris «Inactivo» y el botón deshabilitado.*

---

### Captura 11: Caso B-02 (Baja Repetida en Postman)
> 📷 **Insertar aquí: `B-02_postman.png`**  
> *Descripción: Petición DELETE en Postman ejecutada sobre un producto ya inactivo, mostrando respuesta HTTP 409 Conflict con mensaje «...ya se encuentra inactivo».*

---

### Captura 12: Caso B-03 y B-04 (Eliminación de Categoría)
> 📷 **Insertar aquí: `B-03_spa.png` y `B-04_spa.png`**  
> *Descripción: B-03 mostrando la eliminación limpia (204) de categoría sin productos; y B-04 mostrando la alerta de rechazo (409) al intentar eliminar categoría con productos asociados.*

---

### Captura 13: Mejora Parte C («Ver productos» en Categorías)
> 📷 **Insertar aquí: `mejora_ver_productos.png`**  
> *Descripción: Botón «Ver productos» en la tabla de categorías navegando a `/productos?categoriaId=X` y mostrando la nota «Mostrando productos de la categoría X en los primeros 100 registros».*
