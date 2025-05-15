import { UIManager } from "./UIManager.js";
import { DataService } from "./DataService.js";
import { EventManager } from "./EventManager.js";
import { CalculationService } from "./CalculationService.js";
import { JSONService } from "./JSONService.js";
import { Utils } from "./Utils.js";

const AppController = (() => {
    async function init() { // Made init async
        UIManager.cacheDOM(); // Cache DOM elements first
        await DataService.cargarCatalogos(); // Wait for catalogs to load
        UIManager.reiniciarSimulador(); // Then initialize UI (which adds first row)
        UIManager.bindEvents();
        
        EventManager.subscribe("catalogosCargados", UIManager.actualizarSelectoresConCatalogos);
        EventManager.subscribe("catalogosError", UIManager.actualizarSelectoresConCatalogos); // Still try to update with error messages
        EventManager.subscribe("calcularPlanSolicitado", handleCalcularPlan);
        EventManager.subscribe("calculoCompletado", UIManager.mostrarResultados);
        EventManager.subscribe("descargarPDFsolicitado", () => {
            const datos = UIManager.getDatosPlanActual();
            if (datos) JSONService.generarYDescargarPDF(datos);
            else Utils.mostrarNotificacion("No hay datos de plan para generar PDF.", "warning");
        });
        EventManager.subscribe("exportarJSONsolicitado", () => {
            const datos = UIManager.getDatosPlanActual();
            if (datos) JSONService.descargarJSON(datos, `contrato_${datos.folio}.json`);
            else Utils.mostrarNotificacion("No hay datos de plan para exportar a JSON.", "warning");
        });
        EventManager.subscribe("contratarPlanSolicitado", () => {
            const datos = UIManager.getDatosPlanActual();
            if (datos) {
                DataService.agregarOActualizarContratoHistorial(datos);
                JSONService.descargarJSON(datos, `contrato_firmado_${datos.folio}.json`); // Simulate contract signature by download
                Utils.mostrarNotificacion(`Contrato ${datos.folio} guardado y exportado.`, "success");
            } else Utils.mostrarNotificacion("No hay plan para contratar.", "warning");
        });
        EventManager.subscribe("editarContratoActualSolicitado", () => {
            const datos = UIManager.getDatosPlanActual();
            if (datos) UIManager.reiniciarSimulador(datos); // Reload current plan data into form
            else Utils.mostrarNotificacion("No hay plan para editar.", "warning");
        });
        EventManager.subscribe("historialSolicitado", () => {
            const historial = DataService.getHistorial();
            UIManager.renderizarHistorial(historial);
        });
        EventManager.subscribe("cargarHistorialSolicitado", (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const contratos = JSON.parse(e.target.result);
                        if (Array.isArray(contratos)) {
                            DataService.setHistorial(contratos);
                            Utils.mostrarNotificacion("Historial cargado correctamente.", "success");
                        } else Utils.mostrarNotificacion("El archivo no contiene un array de contratos válido.", "error");
                    } catch (err) { Utils.mostrarNotificacion(`Error al leer el archivo de historial: ${err.message}`, "error"); }
                };
                reader.readAsText(file);
            }
        });
        EventManager.subscribe("historialActualizado", UIManager.renderizarHistorial); // Re-render on update
    }
    function handleCalcularPlan() {
        const $ = UIManager.getDOM(); // Use the new getter
        if (!$) { Utils.mostrarNotificacion("Error interno: DOM no accesible.", "error"); return; }
        if (!$.nombreDeudor || !$.numCuotas) { 
            Utils.mostrarNotificacion("Elementos del formulario (nombreDeudor o numCuotas) no encontrados. Verifique el HTML.","error"); 
            return; 
        }
        const nombre = $.nombreDeudor.value.trim();
        const cuotas = $.numCuotas.value; // CalculationService will parse and validate
        const deudas = UIManager.recolectarDatosDeudas();
        const folioOld = UIManager.getFolioEditando();
        CalculationService.calcularTotalesPlan(deudas, cuotas, nombre, folioOld);
    }
    return { init };
})();

// Initialize the application when the DOM is ready
document.addEventListener("DOMContentLoaded", AppController.init);

