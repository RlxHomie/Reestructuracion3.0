# Checklist: Preparación del Paquete de Producción Final

## Fase 1: Verificación y Finalización del Código JavaScript (`main_corrected_v2.js`)

- [x] **Mejora de `toggleCargando`**: Asegurar que `Utils.toggleCargando` se utiliza consistentemente en operaciones críticas como la generación de PDF y la exportación/guardado de JSON para proporcionar feedback visual adecuado.
    - [x] Verificado en `PDFService.generarPDF`.
    - [x] Verificado en `JSONService.descargarJSON`.
    - [x] Verificado en `JSONService.leerArchivoJSON`.
    - [x] Verificado en `DataService.cargarCatalogos`.
    - [x] Verificado en `AppController.handleCargarHistorial`.
- [x] **Comprobaciones de Existencia de Elementos HTML**: Implementar y verificar comprobaciones `if (element)` antes de utilizar elementos del DOM referenciados desde JavaScript, especialmente en `UIManager.cacheDOM` y `UIManager.bindEvents`.
    - [x] `UIManager.cacheDOM` incluye `console.warn` si un ID no se encuentra.
    - [x] `UIManager.bindEvents` incluye comprobaciones de existencia de `dom.elemento` antes de añadir `addEventListener`.
    - [x] `Utils.validarInputNumerico` verifica si el input existe.
    - [x] `Utils.toggleCargando` verifica si los elementos de carga existen.
- [x] **Corrección de `id="resultadoFinal"`**: Confirmado que no hay referencias a `resultadoFinal` o `resultadoFinalCard` en `main_corrected_v2.js`.
- [x] **Manejo de Rutas JSON**: Confirmado que las rutas a `entidades.json` y `tipos_producto.json` son relativas al `index.html` (ej: `data_entidades/entidades.json`) y funcionan correctamente con `fetch`.
- [x] **Funcionalidad General**: Revisar que todas las funcionalidades principales (agregar/eliminar deudas, cálculo, generación PDF/JSON, historial) estén operativas con las últimas correcciones.

## Fase 2: Preparación de Archivos con Nombres Estándar para Producción

- [ ] Crear una nueva estructura de directorios para el paquete final (ej: `/home/ubuntu/upload/simulador_dmd_produccion_final/`).
- [x] Copiar el archivo `index.html` (la última versión funcional, probablemente de `simulador_dmd_robusto_escalable/index.html`) a la raíz de la nueva estructura.
- [x] Crear la carpeta `js/` en la nueva estructura.
- [x] Copiar el archivo `main_corrected_v2.js` a `simulador_dmd_produccion_final/js/main.js`.
- [x] Crear la carpeta `css/` en la nueva estructura.
- [x] Copiar el archivo `styles.css` (la última versión funcional, probablemente de `simulador_dmd_robusto_escalable/css/styles.css`) a `simulador_dmd_produccion_final/css/styles.css`.
- [x] Verificar y asegurar que `index.html` enlaza correctamente a `css/styles.css` y `js/main.js` (sin sufijos como `_v2` o `_corrected`).
- [x] Copiar las carpetas `data_entidades/`, `data_tipos_producto/` y `libs/` con su contenido a la nueva estructura.
- [x] Crear las carpetas `assets/` (vacía, para que el usuario añada sus imágenes) y `contratos_guardados/` (vacía) en la nueva estructura.

## Fase 3: Documentación y Empaquetado Final

- [ ] Crear un archivo `README.md` final con instrucciones claras para la instalación, estructura de archivos y uso del simulador en un entorno de producción. Incluir notas sobre la colocación de assets.
- [ ] Empaquetar toda la estructura de `simulador_dmd_produccion_final/` en un único archivo ZIP (ej: `simulador_dmd_produccion_final.zip`).
- [ ] Incluir este checklist (`todo_produccion_final.md`) y el `README.md` en el ZIP o como adjuntos separados.

## Fase 4: Entrega al Usuario

- [ ] Enviar el archivo ZIP final y el `README.md` al usuario.
- [ ] Confirmar que el usuario ha recibido los archivos y preguntar si tiene alguna otra duda.

