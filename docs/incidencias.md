# Registro de Incidencias — Sesión 14

| ID | Módulo | Descripción y pasos | Severidad | Causa | Corrección (commit) | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| INC-01 | Ventas / Caché | Tras registrar una venta, el listado de Productos podía mostrar el stock anterior si el listado estaba cacheado. | Alta | Faltaba `@CacheEvict(value = "productos", allEntries = true)` en `VentaServiceImpl.registrar` y `anular`. | *(completar hash al hacer commit)* | En verificación |
| INC-02 | Ventas / Paginación | En Consulta de ventas, al cambiar filtros o recargar con `F5`, no sincronizaba la página en la URL ni paginaba en BD (`subList` en memoria y typo `: desde` en JPQL). | Alta | `VentaRepository.buscar` traía todas las filas en memoria y `VentaList` usaba señales locales en vez de `queryParams`. | *(completar hash al hacer commit)* | En verificación |
| INC-03 | Productos / Paginación | `GET /api/v1/productos?pagina=0&tamanio=500` no devolvía HTTP 409 y `ProductoList` perdía la página al presionar `F5`. | Media | Faltaba validación de tamaño máximo (`1..100`) en backend y enlace a URL (`rxResource` + `linkedSignal`) en frontend. | *(completar hash al hacer commit)* | En verificación |
