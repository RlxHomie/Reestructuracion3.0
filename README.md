# Simulador de Reestructuración de Deuda DMD - Versión Mejorada

Este proyecto es una versión mejorada del Simulador de Reestructuración de Deuda de DMD. Se han implementado varias mejoras críticas, arquitectónicas y de experiencia de usuario para hacerlo más robusto, escalable y fácil de usar.

## Mejoras Implementadas

### 1. Correcciones Críticas Inmediatas:

*   **Accesibilidad de `UIManager.dom`**: Se solucionó un problema que impedía el acceso a los elementos del DOM gestionados por `UIManager` desde otros módulos, implementando un getter `UIManager.getDOM()`.
*   **Error en `handleCalcularPlan`**: Corregido el `TypeError` que ocurría al intentar calcular un plan debido al problema de accesibilidad del DOM.
*   **Temporización de Creación de Fila Inicial**: Asegurado que los catálogos de entidades y tipos de producto se carguen completamente *antes* de que se intente crear la primera fila de deuda en la interfaz, evitando errores por datos no disponibles.
*   **Celdas "Congeladas" sin `<select>`**: Modificada la lógica de creación de filas de deuda para que siempre se generen los elementos `<select>` para tipo de producto y entidad, incluso si los catálogos aún no se han cargado. Estos se muestran deshabilitados con un mensaje de "cargando" y se actualizan una vez que los datos están disponibles.
*   **Rutas Relativas de JSON**: Ajustadas las rutas de carga para los archivos `entidades.json` y `tipos_producto.json` para que funcionen correctamente incluso cuando la aplicación se sirve desde un subdirectorio (común en plataformas como GitHub Pages).

### 2. Mejoras Arquitectónicas:

*   **Módulos ES Nativos**: El código monolítico de `main.js` ha sido refactorizado en múltiples módulos ES6 (`.js` files en la carpeta `js/`), mejorando la organización, mantenibilidad y permitiendo un mejor manejo de dependencias. Los módulos incluyen:
    *   `AppController.js`: Orquestador principal de la aplicación.
    *   `UIManager.js`: Gestión de todos los aspectos de la interfaz de usuario.
    *   `DataService.js`: Manejo de la carga de datos (catálogos, historial) y lógica de persistencia.
    *   `CalculationService.js`: Lógica de negocio para todos los cálculos del plan de reestructuración.
    *   `EventManager.js`: Un sistema simple de publicación/suscripción para la comunicación entre módulos.
    *   `JSONService.js`: Funcionalidades para exportar datos a JSON y generar PDFs.
    *   `Config.js`: Constantes y configuraciones de la aplicación.
    *   `Utils.js`: Funciones de utilidad (notificaciones, validaciones, formato, etc.).
*   **Persistencia con IndexedDB**: La funcionalidad de historial de contratos ahora utiliza IndexedDB para el almacenamiento persistente en el navegador del cliente, eliminando la necesidad de descargar y cargar archivos JSON manualmente para mantener el historial. Se utiliza la librería `idb-keyval` para simplificar la interacción con IndexedDB.
*   **Carga Dinámica de Datos**: Los datos de entidades y tipos de producto se cargan dinámicamente desde archivos JSON externos (`data_entidades/entidades.json` y `data_tipos_producto/tipos_producto.json`).
*   **Restricción de Descuento/Comisiones**: Implementada una restricción que impide generar el PDF y "contratar" si la suma total del descuento aplicado y las comisiones excede el 95% de la deuda original (configurable en `Config.js`).

### 3. Mejoras de Código y Experiencia de Usuario:

*   **Uso de `const` sobre `let`**: Se ha priorizado el uso de `const` para variables que no se reasignan.
*   **Conversión y Validación Numérica Robusta**: Se utiliza `Number()` y `Number.isNaN()` para una conversión y validación de números más segura y consistente.
*   **Mejora en Notificaciones y Feedback**: El sistema de notificaciones es más claro y se proporciona mejor feedback al usuario durante las operaciones (carga, errores, éxito).
*   **Manejo de Errores Mejorado**: Se ha mejorado el manejo de errores en la carga de datos, cálculos y interacciones del usuario.
*   **PDF Mejorado**: La generación de PDF se ha revisado para asegurar que el contenido sea legible y profesional, utilizando `jsPDF` y `jsPDF-AutoTable`.
*   **Interfaz de Usuario**: Se han realizado pequeños ajustes en la interfaz para mejorar la usabilidad, como la actualización de la tabla de desglose en el plan para que coincida más con el PDF y la adición de un botón para limpiar el historial de IndexedDB.

## Estructura de Archivos del Paquete

El paquete final (`simulador_dmd_mejorado.zip`) contiene la siguiente estructura:

```
/simulador_dmd_mejorado/
|-- index.html                     # Archivo HTML principal
|-- css/
|   |-- styles.css                 # Hoja de estilos principal
|-- js/
|   |-- AppController.js           # Módulo principal de la aplicación
|   |-- CalculationService.js      # Módulo de lógica de cálculos
|   |-- Config.js                  # Módulo de configuración
|   |-- DataService.js             # Módulo de servicios de datos (catálogos, IndexedDB)
|   |-- EventManager.js            # Módulo de gestión de eventos
|   |-- JSONService.js             # Módulo para exportar JSON y generar PDF
|   |-- UIManager.js               # Módulo de gestión de la interfaz de usuario
|   |-- Utils.js                   # Módulo de utilidades
|-- libs/
|   |-- jspdf.umd.min.js           # Librería jsPDF
|   |-- jspdf.plugin.autotable.js  # Plugin AutoTable para jsPDF
|   |-- html2canvas.min.js         # (No utilizado activamente en la versión final, pero presente en archivos originales)
|   |-- html2pdf.bundle.min.js     # (No utilizado activamente en la versión final, pero presente en archivos originales)
|-- data_entidades/
|   |-- entidades.json             # Datos de entidades financieras
|-- data_tipos_producto/
|   |-- tipos_producto.json        # Datos de tipos de producto
|-- assets/
|   |-- DMD-LOGO.png               # Logo de la empresa
|   |-- favicon.png                # Favicon de la aplicación
|-- node_modules/                  # (Solo si se incluye `idb-keyval` directamente)
|   |-- idb-keyval/                # Librería idb-keyval para IndexedDB
|       |-- dist/index.js
|       |-- ... (otros archivos de la librería)
|-- README.md                      # Este archivo
```

**Nota sobre `node_modules`**: La librería `idb-keyval` se importa directamente desde `node_modules`. Para desplegar, asegúrate de que esta ruta sea accesible o considera empaquetar las dependencias con una herramienta como Webpack o Rollup si se requiere un build más optimizado para producción (fuera del alcance de esta mejora).

## Cómo Ejecutar

1.  Descomprime el archivo `simulador_dmd_mejorado.zip`.
2.  Abre el archivo `index.html` en un navegador web moderno que soporte módulos ES6 e IndexedDB (ej. Chrome, Firefox, Edge).

Debido al uso de módulos ES6 (`import`/`export`), algunos navegadores pueden requerir que los archivos se sirvan a través de un servidor web local (incluso para desarrollo) debido a restricciones de seguridad CORS al cargar módulos desde `file:///`. Una forma sencilla de hacerlo es usando la extensión "Live Server" en VSCode, o ejecutando un simple servidor HTTP en la carpeta del proyecto (e.g., `python -m http.server` o `npx serve`).

## Funcionalidades Específicas Implementadas (según solicitud original):

1.  **Carga dinámica desde un archivo externo**: Realizado. Los datos de entidades y tipos de producto se cargan desde `data_entidades/entidades.json` y `data_tipos_producto/tipos_producto.json` respectivamente.
2.  **Restricción de descuento/comisiones**: Implementado. Si la suma del total a pagar (que incluye descuentos y comisiones) excede el 95% de la deuda original, se impide la contratación y se muestra una notificación.
3.  **Generación de JSON con el contrato**: Realizado. Al "Guardar Contrato (Historial)", los datos del plan se guardan en IndexedDB y también se ofrece la descarga de un archivo JSON con la información del contrato.

---

Desarrollado por Manus (Agente IA) para DMD.
