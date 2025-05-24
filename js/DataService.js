import { Config } from "./Config.js";
import { Utils } from "./Utils.js";
import { EventManager } from "./EventManager.js";
import { get, set, keys as idbKeys, del as idbDel, clear as idbClear } from "../node_modules/idb-keyval/dist/index.js"; // Adjusted path

const IDB_CONTRATOS_KEY = "contractHistory";

export const DataService = (() => {
    let entidades = [], tiposProducto = [], catalogosCargados = false;
    // historialMemoria will now be primarily populated from IndexedDB on init
    let historialMemoria = []; 

    async function inicializarHistorialDesdeIDB() {
        try {
            const storedHistory = await get(IDB_CONTRATOS_KEY);
            if (Array.isArray(storedHistory)) {
                historialMemoria = storedHistory;
            } else {
                // If nothing is stored or not an array, initialize with empty and store it
                historialMemoria = [];
                await set(IDB_CONTRATOS_KEY, historialMemoria);
            }
            EventManager.publish("historialActualizado", getHistorial());
        } catch (error) {
            console.error("Error inicializando historial desde IndexedDB:", error);
            Utils.mostrarNotificacion("Error al cargar historial guardado.", "error");
            historialMemoria = []; // Fallback to empty in-memory history
            EventManager.publish("historialActualizado", getHistorial());
        }
    }

    async function cargarCatalogos() {
        Utils.toggleCargando(true, "Cargando catálogos...");
        try {
            const fetchEnt = fetch(Config.LOCAL_ENTIDADES_PATH).then(r => r.ok ? r.json() : Promise.reject(new Error(`Entidades: ${r.statusText}`))).catch(e => (Utils.mostrarNotificacion(`Error cargando entidades: ${e.message}`, "error", 6000), Config.DEFAULT_ERROR_ENTIDADES));
            const fetchTipos = fetch(Config.LOCAL_TIPOS_PRODUCTO_PATH).then(r => r.ok ? r.json() : Promise.reject(new Error(`Tipos Prod: ${r.statusText}`))).catch(e => (Utils.mostrarNotificacion(`Error cargando tipos producto: ${e.message}`, "error", 6000), Config.DEFAULT_ERROR_TIPOS_PRODUCTO));
            const [loadedEnt, loadedTipos] = await Promise.all([fetchEnt, fetchTipos]);
            entidades = Array.isArray(loadedEnt) && loadedEnt.length > 0 ? loadedEnt : Config.DEFAULT_ERROR_ENTIDADES;
            tiposProducto = Array.isArray(loadedTipos) && loadedTipos.length > 0 ? loadedTipos : Config.DEFAULT_ERROR_TIPOS_PRODUCTO;
            if (entidades !== Config.DEFAULT_ERROR_ENTIDADES && tiposProducto !== Config.DEFAULT_ERROR_TIPOS_PRODUCTO) {
                catalogosCargados = true; 
                EventManager.publish("catalogosCargados", { entidades, tiposProducto });
            } else {
                catalogosCargados = false; 
                EventManager.publish("catalogosError", { entidades, tiposProducto });
                Utils.mostrarNotificacion("Error al cargar algunos catálogos. Por favor, revise la consola.", "error");
            }
        } catch (e) {
            Utils.mostrarNotificacion(`Error crítico al cargar catálogos: ${e.message}.`, "error", 6000);
            entidades = Config.DEFAULT_ERROR_ENTIDADES;
            tiposProducto = Config.DEFAULT_ERROR_TIPOS_PRODUCTO;
            catalogosCargados = false; 
            EventManager.publish("catalogosError", { entidades, tiposProducto });
        }
        Utils.toggleCargando(false);
    }

    function getEntidades() { return [...entidades]; }
    function getTiposProducto() { return [...tiposProducto]; }
    function areCatalogosCargados() { return catalogosCargados; }
    function obtenerLimiteDescuento(tipo) { return Config.LIMITES_DESCUENTO[tipo] !== undefined ? Config.LIMITES_DESCUENTO[tipo] : 100; }
    
    // Historial functions now interact with IndexedDB via historialMemoria and persist changes
    function getHistorial() { 
        return [...historialMemoria]; 
    }

    function getContratoPorFolio(folio) { 
        return historialMemoria.find(c => c.folio === folio); 
    }

    async function agregarOActualizarContratoHistorial(contrato) {
        const idx = historialMemoria.findIndex(c => c.folio === contrato.folio);
        if (idx !== -1) {
            historialMemoria[idx] = contrato;
        } else {
            historialMemoria.push(contrato);
        }
        try {
            await set(IDB_CONTRATOS_KEY, historialMemoria);
            Utils.mostrarNotificacion("Contrato guardado en el historial local.", "success");
        } catch (error) {
            console.error("Error guardando contrato en IndexedDB:", error);
            Utils.mostrarNotificacion("Error al guardar contrato localmente.", "error");
        }
        EventManager.publish("historialActualizado", getHistorial());
    }

    async function setHistorial(contratos) { // Used for importing, will overwrite IndexedDB
        if (Array.isArray(contratos)) {
            historialMemoria = contratos;
            try {
                await set(IDB_CONTRATOS_KEY, historialMemoria);
                Utils.mostrarNotificacion("Historial importado y guardado localmente.", "success");
            } catch (error) {
                console.error("Error importando historial a IndexedDB:", error);
                Utils.mostrarNotificacion("Error al guardar historial importado.", "error");
            }
        } else {
            historialMemoria = [];
             try {
                await set(IDB_CONTRATOS_KEY, historialMemoria); // Clear if invalid data
            } catch (error) {
                console.error("Error limpiando historial en IndexedDB tras importación fallida:", error);
            }
        }
        EventManager.publish("historialActualizado", getHistorial());
    }

    async function limpiarHistorial() {
        historialMemoria = [];
        try {
            await idbClear(); // Clear entire IndexedDB store
            // For safety, also delete the specific key used by this app
            await idbDel(IDB_CONTRATOS_KEY);
            await set(IDB_CONTRATOS_KEY, []); // Ensure the key exists with an empty array after delete
            Utils.mostrarNotificacion("Historial local limpiado.", "success");
        } catch (error) {
            console.error("Error limpiando historial en IndexedDB:", error);
            Utils.mostrarNotificacion("Error al limpiar el historial local.", "error");
        }
        EventManager.publish("historialActualizado", getHistorial());
    }

    return { 
        cargarCatalogos, 
        getEntidades, 
        getTiposProducto, 
        areCatalogosCargados, 
        obtenerLimiteDescuento, 
        getHistorial, 
        getContratoPorFolio, 
        agregarOActualizarContratoHistorial, 
        setHistorial, 
        limpiarHistorial,
        inicializarHistorialDesdeIDB // Expose for AppController to call on init
    };
})();
