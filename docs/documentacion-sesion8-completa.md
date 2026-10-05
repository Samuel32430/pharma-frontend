# Informe Técnico y Matriz de Pruebas: Dependencias entre Categorías y Productos

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
- **Colección de Postman Exportada:** `postman/PharmaSoft-S8-Dependencias.json`
- **Fecha:** Octubre 2026

---

## 1. Introducción y Objetivo de la Actividad

El presente informe consolida los resultados del diseño, ejecución y evaluación de la matriz de pruebas de dependencias entre las entidades **Categorías** y **Productos** en la plataforma **PharmaSoft**.
La actividad evalúa de forma comparativa la capacidad defensiva de la interfaz de usuario reactiva (SPA en Angular 22) frente a las validaciones efectivas implementadas en la API REST del backend (Spring Boot 3), identificando discrepancias de integridad cuando se interactúa directamente con el servidor mediante **Postman**.

---

## Parte A. Matriz de Pruebas de Dependencias (18 Casos)

### Precondiciones de la Base de Datos
- **Categorías activas (3):** ID 1 (*Analgésicos*), ID 2 (*Antibióticos*), ID 4 (*Dermatológicos*).
- **Categoría inactiva (1):** ID 3 (*Vitaminas*, `estado: false`).
- **Productos registrados (8):** Repartidos entre categorías activas e inactivas, con al menos 1 producto dado de baja lógica (`estado: false`).

### Tabla de Ejecución de Pruebas

| ID | Operación | Precondición | Datos Enviados | Resultado Esperado (Regla) | Resultado Obtenido (SPA / HTTP) | Estado | Evidencia |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **A-01** | Registrar producto válido en cat. activa | Cat. 1 activa | Nombre: "Paracetamol 500 mg x 100", Precio: 15.50, Stock: 50, CatId: 1 | 201 Created; aparece en listado con su categoría. | SPA redirige al listado; tabla muestra nueva fila con "Analgésicos". HTTP POST responde **201 Created**. | **PASA** | `A-01_spa.png` |
| **A-02** | Registrar producto sin elegir categoría | Formulario nuevo abierto | Nombre: "Ibuprofeno 400 mg", Precio: 12.00, Stock: 20, sin categoría | SPA no envía. Por API sin categoriaId responde 400 Bad Request. | SPA muestra *"Seleccione la categoría del producto"*; no envía HTTP. En Postman responde **400 Bad Request**. | **PASA** | `A-02_spa.png`, `A-02_postman.png` |
| **A-03** | Registrar producto con categoriaId 999 | Cat. 999 no existe en BD | POST con `categoriaId: 999`, Nombre: "Amoxicilina 500 mg", Precio: 25.00 | 404 Not Found con mensaje descriptivo de categoría no encontrada. | Postman responde **404 Not Found**: *"La categoria no se encontró"*. | **PASA** | `A-03_postman.png` |
| **A-04** | Registrar producto en categoría inactiva | Cat. 3 (*Vitaminas*) con `estado: false` | `categoriaId: 3`, Nombre: "Producto de prueba A-04", Precio: 5.50, Stock: 10 | La SPA no debe ofrecerla. Por API debe rechazarse con 409 Conflict. | La SPA no la ofrece en el select. En Postman la API responde **201 Created** y asocia el producto a la cat. inactiva. | **FALLA (H-01)** | `A-04_postman.png` |
| **A-05** | Nombre existente en otra capitalización | Ya existe "Paracetamol 500 mg x 100" | Nombre: "paracetamol 500 mg x 100", Precio: 16.00, Stock: 10, CatId: 1 | 409 Conflict: *"Ya existe un producto con el nombre..."* | SPA muestra alerta roja superior con mensaje del backend. HTTP responde **409 Conflict**. | **PASA** | `A-05_spa.png` |
| **A-06** | Registrar producto con precio 0 y stock −1 | Formulario nuevo abierto | Nombre: "Jarabe Tos", Precio: 0.00, Stock: -1, CatId: 1 | SPA bloquea. API: 400 con mapa de `validationErrors`. | SPA resalta ambos campos en rojo. En Postman responde **400 Bad Request** con errores en `precio` y `stock`. | **PASA** | `A-06_spa.png`, `A-06_postman.png` |
| **A-07** | *(Propio)* Registrar producto con nombre en blanco | Formulario de alta | Nombre: "   ", Precio: 10.00, Stock: 5, CatId: 1 | Rechazo síncrono en SPA y rechazo 400/409 en backend. | SPA bloquea envío. En Postman responde **409 Conflict**: *"El nombre del producto no puede estar vacio"*. | **PASA** | `A-07_postman.png` |
| **A-08** | *(Propio)* Precio con decimales extendidos | Formulario de alta | Nombre: "Alcohol 70% 500ml", Precio: 8.995, Stock: 25, CatId: 1 | Validación de precisión monetaria. | API persiste redondeando según escala de base de datos. HTTP responde **201 Created**. | **PASA** | `A-08_postman.png` |
| **C-01** | Cambiar categoría de producto a otra activa | Producto ligado a cat 1; cat 2 activa | Editar producto 1: cambiar `categoriaId` de 1 a 2 | 200 OK; la tabla muestra la nueva categoría. | Formulario envía PUT; tabla actualiza la fila mostrando "Antibióticos". HTTP **200 OK**. | **PASA** | `C-01_spa.png` |
| **C-02** | Cambiar categoría de producto a una inactiva | Cat. 3 inactiva | Editar producto 1: cambiar `categoriaId` a 3 por API | SPA debe impedirlo. Por API debe rechazarse con 409 Conflict. | SPA no muestra la categoría inactiva en el select. Por Postman la API responde **200 OK** y reasigna. | **FALLA (H-02)** | `C-02_postman.png` |
| **C-03** | Desactivar categoría con productos activos | Cat. 1 activa con productos activos | Desactivar Cat. 1 en `/categorias/:id/editar` | Permitir con advertencia; productos quedan ligados a categoría inactiva para histórico de ventas. | SPA permite desactivar; categoría pasa a inactiva. En productos, los registros mantienen su categoría. | **PASA** | `C-03_spa.png` |
| **C-04** | Concurrencia (2 pestañas): P1 abre alta con cat X; P2 desactiva cat X; P1 guarda | P1 con formulario abierto; cat X activa en carga inicial | P2 desactiva cat X. P1 envía formulario | El producto no debe quedar en categoría inactiva (409 Conflict). | P1 envía POST; la API no verifica el estado actual de la categoría y responde **201 Created**. | **FALLA (H-03)** | `C-04_spa.png` |
| **C-05** | *(Propio)* Actualizar con nombre duplicado | Prod 1 ("Paracetamol") y Prod 2 ("Ibuprofeno") | Editar Prod 1: cambiar nombre a "Ibuprofeno" | 409 Conflict: *"Ya existe un producto con el nombre..."* | Backend ejecuta `existsByNombreIgnoreCaseAndIdNot` y responde **409 Conflict**. SPA muestra alerta. | **PASA** | `C-05_spa.png` |
| **B-01** | Dar de baja un producto activo | Producto activo en listado | Clic en "Dar de baja" y confirmar | 204 No Content; fila cambia a "Inactivo" y botón se deshabilita. | Se envía DELETE; backend marca `estado = false`. La fila muestra badge gris "Inactivo" y botón bloqueado. | **PASA** | `B-01_spa.png` |
| **B-02** | Dar de baja otra vez el mismo producto | Producto ya inactivo | DELETE `/api/v1/productos/{id}` por Postman | 409 Conflict: *"El producto con id X ya se encuentra inactivo"*. | Postman responde **409 Conflict** con mensaje de regla de negocio. | **PASA** | `B-02_postman.png` |
| **B-03** | Eliminar categoría sin productos | Cat. 4 sin ningún producto | Clic en "Eliminar" en `/categorias` | 204 No Content; desaparece de tabla y select. | Se envía DELETE; categoría eliminada de la base de datos (204). Desaparece de la SPA. | **PASA** | `B-03_spa.png` |
| **B-04** | Eliminar categoría con productos dados de baja | Cat. 1 con todos sus productos en baja lógica | Clic en "Eliminar" Cat. 1 | Bloquear con 409 Conflict para proteger integridad referencial histórica en ventas. | Backend ejecuta validación `existsByCategoriaId` y responde **409 Conflict**. SPA muestra alerta. | **PASA** | `B-04_spa.png` |
| **B-05** | *(Propio)* Dar de baja producto inexistente ID 9999 | ID 9999 no existe en BD | DELETE `/api/v1/productos/9999` por Postman | 404 Not Found: *"Producto no encontrado con id: 9999"*. | Postman responde **404 Not Found** con error estándar. | **PASA** | `B-05_postman.png` |

---

## Parte B. Informe Técnico de Hallazgos

### B1. Resumen de la Ejecución

| Módulo Operativo | Total Casos | Pasan | Fallan (Hallazgos) | Porcentaje de Éxito |
| :--- | :---: | :---: | :---: | :---: |
| **Altas** | 8 | 7 | 1 (H-01) | 87.5 % |
| **Cambios** | 5 | 3 | 2 (H-02, H-03) | 60.0 % |
| **Bajas** | 5 | 5 | 0 | 100.0 % |
| **TOTAL** | **18** | **15** | **3** | **83.3 %** |

---

### B2. Fichas de Hallazgos

#### Ficha de Hallazgo H-01
- **Caso Relacionado:** A-04 (Registrar producto en categoría inactiva)
- **Descripción:** La API REST acepta peticiones POST directas asignando categorías cuyo estado es inactivo (`estado: false`), respondiendo con código 201 Created y violando la regla de negocio que prohíbe dar de alta productos en categorías deshabilitadas.
- **Severidad:** **Alta** (Genera corrupción e inconsistencia de datos en el catálogo).
- **Evidencia Visual:**  
  > 📷 **[ESPACIO PARA CAPTURA: `A-04_postman.png`]**
- **Causa Probable:** En `ProductoServiceImpl.guardar()`, solo se valida la existencia física del registro con `catergoriaRepository.findById()` pero no se comprueba `categoria.getEstado()`.
- **Corrección Propuesta (Backend - Servicio):**
  ```java
  if (Boolean.FALSE.equals(categoria.getEstado())) {
      throw new ReglaNegocioException("No se puede registrar un producto en una categoría inactiva");
  }
  ```

#### Ficha de Hallazgo H-02
- **Caso Relacionado:** C-02 (Cambiar categoría a inactiva)
- **Descripción:** Al actualizar mediante PUT por Postman, la API permite reasignar productos a categorías inactivas respondiendo con código 200 OK.
- **Severidad:** **Alta**.
- **Evidencia Visual:**  
  > 📷 **[ESPACIO PARA CAPTURA: `C-02_postman.png`]**
- **Causa Probable:** En `ProductoServiceImpl.actualizar()`, no se valida el estado lógico de la categoría destino.
- **Corrección Propuesta (Backend - Servicio):**
  ```java
  if (Boolean.FALSE.equals(categoria.getEstado())) {
      throw new ReglaNegocioException("No se puede asignar un producto a una categoría inactiva");
  }
  ```

#### Ficha de Hallazgo H-03
- **Caso Relacionado:** C-04 (Condición de carrera entre pestañas)
- **Descripción:** Si una categoría se desactiva en una pestaña después de que otra pestaña abrió el formulario de alta, el guardado posterior no es interceptado por el backend y persiste el producto indebidamente.
- **Severidad:** **Media / Alta**.
- **Evidencia Visual:**  
  > 📷 **[ESPACIO PARA CAPTURA: `C-04_spa.png`]**
- **Causa Probable:** Validación delegada exclusivamente en el frontend sin verificación atómica en el backend.
- **Corrección Propuesta:** La implementación de la regla H-01 en el backend dentro de `@Transactional` resuelve automáticamente esta condición de carrera al momento del commit en base de datos.

---

### B3. Matriz de Cobertura de Reglas de Negocio

| Regla de Negocio | Dónde se valida hoy | Comportamiento del Sistema |
| :--- | :---: | :--- |
| **Existencia de Categoría** | **Ambas** (SPA + API) | SPA solo ofrece opciones existentes; API responde `404 Not Found`. |
| **Categoría Activa en Altas** | **Solo SPA** | SPA oculta inactivas; API acepta inactivas (**Hallazgo H-01**). |
| **Categoría Activa en Cambios** | **Solo SPA** | SPA bloquea guardado con aviso rojo; API acepta cambios (**Hallazgo H-02**). |
| **Nombre Único de Producto** | **Ambas** (SPA + API) | API responde `409 Conflict`; SPA captura y muestra alerta superior. |
| **Precios y Stocks Válidos** | **Ambas** (SPA + API) | SPA valida con Reactive Forms; API valida con `@DecimalMin` y `@Min` (400 Bad Request). |
| **No eliminar categoría con productos** | **Solo API** | API valida `existsByCategoriaId` y responde `409 Conflict`; SPA muestra alerta modal. |
| **Baja lógica de Producto** | **Ambas** (SPA + API) | SPA deshabilita botón; API valida estado previo y rechaza bajas repetidas con `409 Conflict`. |

---

### B4. Recomendación sobre el Filtro por Categoría

**Diagnóstico:** El filtro actual en `ProductoList` se ejecuta en memoria del navegador (`computed`) sobre la página de 10 registros actual devuelta por el servidor.  
**Propuesta de Arquitectura:**
1. **En `ProductoRepository.java`:** Declarar método paginado `Page<Producto> findByCategoriaId(Long categoriaId, Pageable pageable);`.
2. **En `ProductoController.java`:** Incorporar `@RequestParam(required = false) Long categoriaId`.
3. **En `ProductoServiceImpl.java`:** Si `categoriaId != null`, invocar la consulta filtrada; caso contrario, invocar `findAll(pageable)`.
4. **En `ProductoService.ts`:** Extender `listar(...)` para anexar el parámetro en los `HttpParams`.

---

### B5. Preguntas de Análisis

1. **¿Por qué no basta con que la SPA oculte las categorías inactivas?**  
   Porque la interfaz de usuario no es una barrera de seguridad: cualquier cliente HTTP (Postman, scripts o apps móviles) puede interactuar directamente con la API REST. Los casos A-04 y C-02 demostraron que la API respondió 201 y 200 ante peticiones con categorías inactivas, confirmando que la lógica de integridad debe residir de forma obligatoria en la capa de servicio del backend (`ProductoServiceImpl.java`).

2. **¿Qué debería pasar al desactivar una categoría con productos activos (C-03)?**  
   La decisión óptima es permitir la desactivación emitiendo una advertencia informativa: los productos existentes deben mantenerse comercializables para no afectar las ventas ni el stock físico en almacén, pero la categoría queda bloqueada para impedir la creación de nuevos productos en ella.

3. **¿Por qué en B-04 el backend cuenta también los productos dados de baja al decidir si una categoría se puede eliminar?**  
   Porque una eliminación física mediante `DELETE` rompería la clave foránea en la base de datos o, en caso de cascada, destruiría los productos y sus líneas asociadas en `detalle_venta`, corrompiendo de forma irreversible los reportes financieros históricos, auditorías contables y estadísticas de ingresos por categoría.

4. **¿Qué revela el caso C-04 sobre el momento en que se validan las dependencias?**  
   Revela que no basta con validar las dependencias al cargar la interfaz, pues existe una condición de carrera (*race condition*) entre la carga del formulario y el envío del formulario. La capa de Servicio del Backend es la única que puede resolverlo con certeza porque ejecuta las validaciones dentro de una transacción atómica (`@Transactional`) en el instante exacto de la persistencia.

5. **Si mañana el backend corrige el hallazgo de A-04, ¿qué tendría que cambiar en la SPA?**  
   En la SPA no tendría que cambiar nada de la lógica del formulario: `ProductoForm` ya captura automáticamente los errores HTTP con `mensajeError(err)`. La única diferencia es que ante un intento anómalo o concurrente, el backend emitirá `409 Conflict` y la SPA mostrará de inmediato la alerta roja con el mensaje explicativo devuelto por el servidor.

---

## Parte C. Mejora Implementada en la SPA: «Ver productos»

Se implementó la navegación contextual y la carga reactiva de productos por categoría:

1. **Botón en Categorías (`categoria-list.html`):**  
   Se agregó el enlace en la columna de acciones:
   ```html
   <a [routerLink]="'/productos'" [queryParams]="{ categoriaId: c.id }" class="btn">Ver productos</a>
   ```
2. **Recepción en `ProductoList` (`producto-list.ts`):**  
   Se configuró el input reactivo gracias a `withComponentInputBinding()`:
   ```typescript
   readonly categoriaId = input<string>();
   ```
3. **Filtro Automático y Paginación Extendida:**  
   En `ngOnInit()`, si llega el parámetro, se preselecciona la categoría en el select, se amplía el tamaño de página a 100 registros (`tamanio.set(100)`) y se muestra el banner informativo en la parte superior:
   > *«Mostrando productos de la categoría X en los primeros 100 registros.»*

---

## Espacios para Capturas de Pantalla (Evidencias)

A continuación se indican los 13 espacios donde deben incorporarse las capturas de pantalla obtenidas en las pruebas:

| N.º | Archivo de Captura | Descripción del Contenido a Mostrar | Espacio para Imagen |
| :---: | :--- | :--- | :---: |
| 1 | `A-01_spa.png` | Formulario de alta exitoso y tabla con nueva fila (POST 201) | > 📷 **[INSERTAR AQUÍ: `A-01_spa.png`]** |
| 2 | `A-02_spa.png` | Formulario bloqueado con mensaje «Seleccione la categoría» | > 📷 **[INSERTAR AQUÍ: `A-02_spa.png`]** |
| 3 | `A-02_postman.png` | Postman enviando POST sin `categoriaId` respondiendo 400 Bad Request | > 📷 **[INSERTAR AQUÍ: `A-02_postman.png`]** |
| 4 | `A-03_postman.png` | Postman con `categoriaId: 999` respondiendo 404 Not Found | > 📷 **[INSERTAR AQUÍ: `A-03_postman.png`]** |
| 5 | `A-04_postman.png` | Postman con categoría inactiva respondiendo 201 Created (Hallazgo H-01) | > 📷 **[INSERTAR AQUÍ: `A-04_postman.png`]** |
| 6 | `A-05_spa.png` | Formulario en SPA mostrando alerta 409 por nombre repetido | > 📷 **[INSERTAR AQUÍ: `A-05_spa.png`]** |
| 7 | `A-06_spa.png` | Formulario en SPA con validaciones de precio 0 y stock -1 | > 📷 **[INSERTAR AQUÍ: `A-06_spa.png`]** |
| 8 | `A-06_postman.png` | Postman respondiendo 400 con mapa `validationErrors` | > 📷 **[INSERTAR AQUÍ: `A-06_postman.png`]** |
| 9 | `C-01_spa.png` | Edición exitosa cambiando a otra categoría activa (PUT 200) | > 📷 **[INSERTAR AQUÍ: `C-01_spa.png`]** |
| 10 | `C-02_postman.png` | Postman reasignando categoría inactiva y respondiendo 200 OK (H-02) | > 📷 **[INSERTAR AQUÍ: `C-02_postman.png`]** |
| 11 | `C-04_spa.png` | Dos pestañas en paralelo evidenciando condición de carrera (H-03) | > 📷 **[INSERTAR AQUÍ: `C-04_spa.png`]** |
| 12 | `B-01_spa.png` | Tabla con producto en estado "Inactivo" tras baja lógica (204) | > 📷 **[INSERTAR AQUÍ: `B-01_spa.png`]** |
| 13 | `B-02_postman.png` | Postman intentando dar de baja producto ya inactivo (409 Conflict) | > 📷 **[INSERTAR AQUÍ: `B-02_postman.png`]** |
| 14 | `B-03_spa.png` | Categoría sin productos eliminada limpiamente (204) | > 📷 **[INSERTAR AQUÍ: `B-03_spa.png`]** |
| 15 | `B-04_spa.png` | Alerta bloqueando eliminación de categoría con productos (409) | > 📷 **[INSERTAR AQUÍ: `B-04_spa.png`]** |
| 16 | `mejora_ver_productos.png` | Botón «Ver productos» en Categorías y listado filtrado con nota | > 📷 **[INSERTAR AQUÍ: `mejora_ver_productos.png`]** |
