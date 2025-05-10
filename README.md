# Simulador de Reestructuración de Deudas DMD - Versión de Producción

Este documento proporciona las instrucciones para desplegar y utilizar la versión de producción del Simulador de Reestructuración de Deudas de DMD.

## Estructura de Archivos del Paquete

El archivo ZIP (`simulador_dmd_produccion_final.zip`) contiene la siguiente estructura de directorios y archivos:

```
/simulador_dmd_produccion_final/
|-- index.html                     # Archivo principal de la aplicación
|
|-- css/
|   |-- styles.css                 # Hoja de estilos principal
|
|-- js/
|   |-- main.js                    # Lógica principal de la aplicación en JavaScript
|
|-- data_entidades/
|   |-- entidades.json             # Listado de entidades financieras (editable)
|
|-- data_tipos_producto/
|   |-- tipos_producto.json        # Listado de tipos de producto (editable)
|
|-- libs/                          # Librerías JavaScript de terceros
|   |-- html2canvas.min.js
|   |-- jspdf.umd.min.js
|   |-- html2pdf.bundle.min.js
|
|-- assets/                        # Carpeta para imágenes y otros recursos
|   |-- (Vacía por defecto)        # Colocar aquí DMD-LOGO.png y favicon.png
|
|-- contratos_guardados/           # Carpeta sugerida para almacenar los JSON de contratos generados
|   |-- (Vacía por defecto)
|
|-- README.md                      # Este archivo de instrucciones
|-- todo_produccion_final.md       # Checklist de preparación de esta versión
```

## Despliegue

Este simulador es una aplicación web estática (HTML, CSS, JavaScript) y no requiere un backend complejo para su funcionamiento básico.

1.  **Extraer el ZIP**: Descomprime el archivo `simulador_dmd_produccion_final.zip` en la ubicación deseada de tu servidor web o entorno de alojamiento.
2.  **Colocar Assets**: 
    *   Asegúrate de colocar los archivos de imagen `DMD-LOGO.png` y `favicon.png` dentro de la carpeta `assets/`. Estos archivos no se incluyeron en el ZIP ya que son específicos de tu marca, pero el código está preparado para usarlos desde esa ubicación.
3.  **Servir los Archivos**: Configura tu servidor web (Apache, Nginx, GitHub Pages, Netlify, Vercel, etc.) para servir el contenido de la carpeta extraída. El punto de entrada principal es `index.html`.

## Uso del Simulador

Una vez desplegado, accede al `index.html` a través de tu navegador web.

1.  **Datos del Cliente**: Ingresa el nombre del cliente y el número de cuotas deseado.
2.  **Deudas a Reestructurar**:
    *   Haz clic en "Agregar Deuda" para añadir filas a la tabla.
    *   Para cada deuda, completa el número de contrato (opcional), selecciona el tipo de producto y la entidad de los desplegables, e ingresa el importe de la deuda y el porcentaje de descuento deseado.
    *   El "Importe con Descuento" se calculará automáticamente.
    *   Se aplicarán validaciones para los límites de descuento por tipo de producto.
3.  **Calcular Plan**: Haz clic en "Calcular Plan". Se mostrará un resumen detallado del plan de liquidación, incluyendo un gráfico de ahorro.
    *   **Restricción del 94%**: El sistema impedirá calcular/contratar si el "Total a Pagar Final" (deuda con descuento + comisiones) excede el 94% de la "Deuda Original Total".
4.  **Acciones del Plan**:
    *   **Descargar PDF del Plan**: Genera y descarga un archivo PDF con el resumen del plan.
    *   **Exportar Datos (JSON)**: Descarga un archivo JSON con todos los datos del plan calculado.
    *   **Guardar Contrato (JSON)**: Simula el guardado del contrato descargando un archivo JSON con un nombre estandarizado (`CONTRATO_NombreCliente_Folio.json`). Este archivo se puede guardar en la carpeta `contratos_guardados/` (o donde prefieras) para futuras consultas.
    *   **Editar Contrato Cargado**: Si un plan se cargó desde el historial, este botón permite volver al formulario para modificarlo.
5.  **Reiniciar Simulador**: Limpia todos los campos del formulario y los resultados.
6.  **Ver Historial**:
    *   Abre un panel para cargar contratos previamente guardados (archivos JSON).
    *   Selecciona uno o más archivos JSON de contratos. Estos se añadirán al historial en memoria.
    *   Desde la tabla del historial, puedes "Cargar" un contrato anterior al formulario para revisarlo o editarlo.

## Personalización de Datos

*   **Entidades Financieras**: Puedes modificar la lista de entidades disponibles editando el archivo `data_entidades/entidades.json`.
*   **Tipos de Producto**: Puedes modificar la lista de tipos de producto editando el archivo `data_tipos_producto/tipos_producto.json`.
    *   **Importante**: Si añades o modificas tipos de producto, asegúrate de que los límites de descuento correspondientes estén definidos en el objeto `Config.LIMITES_DESCUENTO` dentro del archivo `js/main.js` si deseas aplicarles límites específicos. Por defecto, si un tipo de producto no tiene un límite definido, se permitirá hasta un 100% de descuento.

## Consideraciones Adicionales

*   **Robustez**: Se han implementado validaciones de entrada, manejo de errores y comprobaciones de existencia de elementos DOM para mejorar la estabilidad.
*   **Escalabilidad (Local)**: La carga de catálogos y el manejo del historial están diseñados para funcionar eficientemente con datos locales. Para un gran volumen de contratos en el historial, la carga de múltiples archivos JSON podría requerir optimizaciones futuras si se convierte en un cuello de botella.
*   **Seguridad**: Al ser una aplicación frontend, no se manejan datos sensibles de forma persistente en un servidor a menos que integres un backend. La funcionalidad de "guardar contrato" descarga un archivo localmente.

Esperamos que esta versión mejorada del simulador sea de gran utilidad.

