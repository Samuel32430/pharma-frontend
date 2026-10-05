# Matriz de Pruebas: Dependencias entre Categorías y Productos

**Asignatura:** Lenguaje de Programación II · Ciclo IV · Semestre 2026-2  
**Actividad Autónoma — Sesión 8**  
**Estudiante:** Samuel Vilca  
**Entorno de Pruebas:** SPA PharmaSoft (Angular 22 en `localhost:4200`) y API REST PharmaBackend (Spring Boot 3 en `localhost:8080/api/v1`) con Postman.

---

## 1. Configuración de Precondiciones de la Base de Datos

Para la ejecución de la batería de pruebas, la base de datos se preparó con:
- **Categorías activas (3):**
  - ID 1: *Analgésicos* (`estado: true`)
  - ID 2: *Antibióticos* (`estado: true`)
  - ID 4: *Dermatológicos* (`estado: true`)
- **Categoría inactiva (1):**
  - ID 3: *Vitaminas* (`estado: false`)
- **Productos registrados (8):**
  - Repartidos entre las categorías activas e inactivas.
  - Al menos 1 producto en estado dado de baja lógica (`estado: false`).

---

## 2. Matriz de Pruebas de Dependencias (18 Casos de Prueba)

| ID | Operación | Precondición | Datos Enviados | Resultado Esperado (Regla de Negocio) | Resultado Obtenido (SPA / HTTP) | Estado | Evidencia Requerida |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **A-01** | Registrar producto válido en categoría activa | Categoría ID 1 activa | `nombre`: "Paracetamol 500 mg x 100", `precio`: 15.50, `stock`: 50, `estado`: true, `categoriaId`: 1 | HTTP 201 Created; redirección al listado donde se visualiza el producto con su categoría. | SPA redirige al listado; tabla muestra nueva fila con "Analgésicos". HTTP POST responde **201 Created**. | **PASA** | `A-01_spa.png`<br>*(Captura del listado con el nuevo producto registrado y pestaña Red con POST 201)* |
| **A-02** | Registrar producto sin elegir categoría | Formulario abierto en modo nuevo | `nombre`: "Ibuprofeno 400 mg", `precio`: 12.00, `stock`: 20, sin seleccionar categoría (`categoriaId: null`) | En SPA el botón se bloquea o valida localmente. Por API sin categoriaId responde 400 Bad Request. | En SPA aparece mensaje: *"Seleccione la categoría del producto"*; no se envía HTTP. En Postman responde **400 Bad Request**. | **PASA** | `A-02_spa.png`<br>`A-02_postman.png`<br>*(Validación en rojo en formulario y respuesta 400 en Postman)* |
| **A-03** | Registrar producto con categoriaId 999 | Categoría 999 no existe en BD | POST con `categoriaId`: 999, `nombre`: "Amoxicilina 500 mg", `precio`: 25.00, `stock`: 30 | HTTP 404 Not Found con mensaje descriptivo de categoría no encontrada. | Postman responde **404 Not Found**: *"La categoria no se encontró"*. | **PASA** | `A-03_postman.png`<br>*(Postman mostrando código 404 y JSON de error)* |
| **A-04** | Registrar producto en categoría inactiva | Categoría ID 3 (*Vitaminas*) tiene `estado: false` | `categoriaId`: 3, `nombre`: "Producto de prueba A-04", `precio`: 5.50, `stock`: 10 | La SPA no debe ofrecerla. Por API REST debe rechazarse con 409 Conflict. | La SPA no la ofrece en el select. En Postman la API responde **201 Created** y asocia el producto a la categoría inactiva. | **FALLA (H-01)** | `A-04_postman.png`<br>*(Captura de Postman mostrando respuesta anómala 201 Created)* |
| **A-05** | Registrar producto con nombre existente en otra capitalización | Ya existe "Paracetamol 500 mg x 100" | `nombre`: "paracetamol 500 mg x 100", `precio`: 16.00, `stock`: 10, `categoriaId`: 1 | HTTP 409 Conflict: *"Ya existe un producto con el nombre..."* | SPA muestra alerta roja superior con error devuelto por backend. HTTP responde **409 Conflict**. | **PASA** | `A-05_spa.png`<br>*(Formulario con alerta roja de conflicto 409)* |
| **A-06** | Registrar producto con precio 0 y stock −1 | Formulario nuevo abierto | `nombre`: "Jarabe Tos", `precio`: 0.00, `stock`: -1, `categoriaId`: 1 | SPA bloquea. Por API responde 400 Bad Request con `validationErrors` en ambos campos. | SPA resalta ambos campos con error de validación local. En Postman responde **400 Bad Request** con errores en `precio` y `stock`. | **PASA** | `A-06_spa.png`<br>`A-06_postman.png`<br>*(Errores síncronos en UI y validaciones JSON en Postman)* |
| **A-07** *(Propio)* | Registrar producto con nombre en blanco o solo espacios | Formulario de alta | `nombre`: "   ", `precio`: 10.00, `stock`: 5, `categoriaId`: 1 | Rechazo síncrono en SPA y rechazo 400/409 en backend (NotBlank / trim vacío). | SPA marca campo inválido. En Postman responde **409 Conflict**: *"El nombre del producto no puede estar vacio"*. | **PASA** | `A-07_postman.png`<br>*(Respuesta de validación de backend ante string vacío)* |
| **A-08** *(Propio)* | Registrar producto con precio con más de 2 decimales | Formulario de alta | `nombre`: "Alcohol 70% 500ml", `precio`: 8.995, `stock`: 25, `categoriaId`: 1 | Validación de escala monetaria o persistencia con escala financiera adecuada. | API persiste redondeando o validando escala según BD. HTTP responde **201 Created**. | **PASA** | `A-08_postman.png`<br>*(Petición y respuesta JSON en Postman)* |
| **C-01** | Cambiar categoría de producto a otra categoría activa | Producto asociado a cat 1; categoría 2 activa | Editar producto 1: cambiar `categoriaId` de 1 a 2 | HTTP 200 OK; el listado refleja la nueva categoría de forma inmediata. | Formulario envía PUT; tabla actualiza la fila mostrando "Antibióticos". HTTP **200 OK**. | **PASA** | `C-01_spa.png`<br>*(Detalle de edición guardada y reflejada en tabla)* |
| **C-02** | Cambiar categoría de producto a una inactiva | Categoría 3 inactiva | Editar producto 1: cambiar `categoriaId` a 3 por API | SPA debe impedirlo. Por API debe rechazarse con HTTP 409 Conflict. | SPA no muestra la categoría inactiva como opción de cambio. Por Postman la API responde **200 OK** y efectúa el cambio. | **FALLA (H-02)** | `C-02_postman.png`<br>*(Captura de Postman mostrando PUT 200 asignando categoría inactiva)* |
| **C-03** | Desactivar categoría que tiene productos activos | Categoría 1 activa con productos activos asociados | Desactivar categoría 1 en `/categorias/:id/editar` | Regla definida: Permitir la desactivación pero emitir advertencia; productos quedan ligados a categoría inactiva para histórico. | SPA permite desactivar; categoría pasa a inactiva. En productos, los registros mantienen su categoría. | **PASA** | `C-03_spa.png`<br>*(Categoría desactivada con advertencia de dependencia)* |
| **C-04** | Concurrencia (2 pestañas): P1 abre alta con cat X; P2 desactiva cat X; P1 guarda | Pestaña 1 con formulario abierto; categoría activa en carga | Pestaña 2 desactiva cat X. Pestaña 1 envía formulario | El producto no debe quedar en una categoría inactiva (debe abortarse con 409). | Pestaña 1 envía POST; la API no verifica el estado actual de la categoría y responde **201 Created**. | **FALLA (H-03)** | `C-04_spa.png`<br>*(Pestaña 1 guardando con categoría recién desactivada en P2)* |
| **C-05** *(Propio)* | Actualizar producto cambiando nombre a uno ya existente de otro producto | Producto 1 ("Paracetamol") y Producto 2 ("Ibuprofeno") | Editar Producto 1: cambiar nombre a "Ibuprofeno" | HTTP 409 Conflict: *"Ya existe un producto con el nombre..."* | Backend valida `existsByNombreIgnoreCaseAndIdNot` y responde **409 Conflict**. SPA muestra alerta roja. | **PASA** | `C-05_spa.png`<br>*(Alerta de nombre duplicado al editar en SPA)* |
| **B-01** | Dar de baja un producto activo | Producto activo en listado | Clic en botón "Dar de baja" y aceptar confirmación | HTTP 204 No Content; fila cambia reactivamente a "Inactivo" y botón queda deshabilitado. | Se envía DELETE; el backend marca `estado = false`. La fila muestra badge gris "Inactivo" y botón deshabilitado. | **PASA** | `B-01_spa.png`<br>*(Fila con estado Inactivo y botón deshabilitado tras baja)* |
| **B-02** | Dar de baja otra vez el mismo producto | Producto ya se encuentra inactivo (`estado: false`) | DELETE `/api/v1/productos/{id}` por Postman | HTTP 409 Conflict: *"El producto con id X ya se encuentra inactivo"*. | Postman responde **409 Conflict** con mensaje de regla de negocio. | **PASA** | `B-02_postman.png`<br>*(Postman mostrando código 409 y mensaje de producto inactivo)* |
| **B-03** | Eliminar una categoría sin productos | Categoría 4 sin ningún producto asignado | Clic en "Eliminar" en `/categorias` | HTTP 204 No Content; desaparece del listado de categorías y del select de productos. | Se envía DELETE; categoría eliminada de la base de datos (204). Desaparece de la SPA. | **PASA** | `B-03_spa.png`<br>*(Listado de categorías sin la fila eliminada)* |
| **B-04** | Eliminar una categoría cuyos productos están todos dados de baja | Categoría 1 con todos sus productos en `estado: false` | Clic en "Eliminar" categoría 1 | Regla definida: Bloquear con 409 Conflict para mantener integridad referencial histórica en ventas. | Backend ejecuta validación `existsByCategoriaId` y responde **409 Conflict**. SPA muestra alerta de bloqueo. | **PASA** | `B-04_spa.png`<br>*(Modal o alerta bloqueando eliminación por productos asociados)* |
| **B-05** *(Propio)* | Intentar dar de baja un producto inexistente | ID 9999 no existe en base de datos | DELETE `/api/v1/productos/9999` por Postman | HTTP 404 Not Found: *"Producto no encontrado con id: 9999"*. | Postman responde **404 Not Found** con error estándar. | **PASA** | `B-05_postman.png`<br>*(Postman mostrando código 404 Not Found)* |

---

## 3. Resumen Cuantitativo

- **Total de casos ejecutados:** 18 casos.
- **Casos Aprobados (Pasan según regla de negocio):** 15 casos (83.3 %).
- **Casos Fallidos (Hallazgos detectados):** 3 casos (16.7 %):
  - **H-01 (Caso A-04):** API permite registrar productos en categorías inactivas.
  - **H-02 (Caso C-02):** API permite reasignar productos a categorías inactivas.
  - **H-03 (Caso C-04):** Carrera de concurrencia persiste productos en categorías inactivadas concurrentemente.
