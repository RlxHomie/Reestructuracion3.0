// main_corrected_v2.js
// Contiene la lógica completa y corregida del simulador, con mejoras en toggleCargando y validaciones de elementos DOM.

// ---------------------------------------
// EventManager (Patrón Observador Simple)
// ---------------------------------------
const EventManager = (() => {
    const events = {};
    function subscribe(eventName, listener) {
        if (!events[eventName]) events[eventName] = [];
        events[eventName].push(listener);
    }
    function unsubscribe(eventName, listener) {
        if (!events[eventName]) return;
        events[eventName] = events[eventName].filter(l => l !== listener);
    }
    function publish(eventName, data) {
        if (!events[eventName]) return;
        events[eventName].forEach(listener => {
            try { listener(data); } catch (error) { console.error(`Error in listener for ${eventName}:`, error); }
        });
    }
    return { subscribe, unsubscribe, publish };
})();

// ---------------------------------------
// Config (Constantes y Configuración)
// ---------------------------------------
const Config = {
    LOCAL_ENTIDADES_PATH: "data_entidades/entidades.json",
    LOCAL_TIPOS_PRODUCTO_PATH: "data_tipos_producto/tipos_producto.json",
    LOCAL_CONTRATOS_DIR: "contratos_guardados/", // No se usa para guardar directamente en esta versión, solo como referencia
    LIMITES_DESCUENTO: {
        "Microcrédito": 50, "Tarjeta de Crédito": 20, "Préstamo Personal": 15,
        "Hipoteca": 15, "Línea de Crédito": 15, "Crédito al Consumo": 15,
        "Préstamo Rápido": 15, "Financiación de Vehículo": 15
    },
    DEFAULT_ERROR_ENTIDADES: ["Error: Entidades no cargadas"],
    DEFAULT_ERROR_TIPOS_PRODUCTO: ["Error: Tipos de producto no cargados"],
    MAX_CUOTAS: 120, MIN_CUOTAS: 1, DEFAULT_NUM_CUOTAS: 12,
    COMISION_EXITO_PORCENTAJE: 0.20, EXTRA_10_PORCENTAJE_DEUDA_ORIGINAL: 0.10,
    IVA_PORCENTAJE: 0.21, RESTRICCION_PAGO_MAXIMO_PORCENTAJE_DEUDA_ORIGINAL: 0.94,
    DEBOUNCE_TIME: 300, NOTIFICATION_DURATION: 4000,
    CHART_COLORS: { TOTAL_A_PAGAR: "#0071e3", AHORRO_TOTAL: "#34c759" },
    MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY: 100
};

// ---------------------------------------
// Utils (Funciones de Utilidad)
// ---------------------------------------
const Utils = (() => {
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    function mostrarNotificacion(mensaje, tipo = "info", duracion = Config.NOTIFICATION_DURATION) {
        document.querySelectorAll(".notificacion").forEach(n => { n.classList.add("fadeOut"); setTimeout(() => n.remove(), 500); });
        const notif = document.createElement("div");
        notif.className = `notificacion ${tipo}`;
        notif.textContent = mensaje;
        document.body.appendChild(notif);
        setTimeout(() => { notif.style.transform = "translateY(0)"; notif.style.opacity = "1"; }, 10);
        setTimeout(() => { notif.classList.add("fadeOut"); setTimeout(() => notif.remove(), 500); }, duracion);
    }
    function confirmarAccion(mensaje, accionSi, accionNo = null) {
        if (confirm(mensaje)) { if (typeof accionSi === "function") accionSi(); }
        else { if (typeof accionNo === "function") accionNo(); }
    }
    function validarInputNumerico(input, min = 0, max = Infinity, msg = null, emptyOk = false) {
        if (!input) { console.warn("validarInputNumerico: input no existe."); return false; }
        const valStr = input.value.trim();
        if (emptyOk && valStr === "") { input.classList.remove("error"); return true; }
        const val = parseFloat(valStr);
        if (isNaN(val) || val < min || val > max) {
            input.classList.add("error");
            mostrarNotificacion(msg || `Valor inválido. Debe estar entre ${min} y ${max}.`, "error");
            setTimeout(() => input.classList.remove("error"), 1500);
            return false;
        }
        input.classList.remove("error"); return true;
    }
    function formatoMoneda(num) {
        if (isNaN(parseFloat(num))) return "€0.00";
        return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }
    function toggleCargando(mostrar, mensaje = "Procesando...") {
        const ind = document.getElementById("indicadorCarga"), msgEl = document.getElementById("mensajeCarga");
        if (ind && msgEl) { ind.style.display = mostrar ? (msgEl.textContent = mensaje, "flex") : "none"; }
        else { console.warn("Utils.toggleCargando: Elementos de carga 'indicadorCarga' o 'mensajeCarga' no encontrados."); }
    }
    function aplicarEfectoClick(btn) { if (btn && btn.classList) { btn.classList.add("clicked"); setTimeout(() => btn.classList.remove("clicked"), 200); } }
    function generarFolioUnico() { return `DMD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`; }
    function obtenerFechaActualFormateada() {
        const h = new Date(), d = String(h.getDate()).padStart(2, "0"), m = String(h.getMonth() + 1).padStart(2, "0");
        return `${d}/${m}/${h.getFullYear()}`;
    }
    return { debounce, mostrarNotificacion, confirmarAccion, validarInputNumerico, formatoMoneda, toggleCargando, aplicarEfectoClick, generarFolioUnico, obtenerFechaActualFormateada };
})();

// ---------------------------------------
// DataService (Gestión de Datos)
// ---------------------------------------
const DataService = (() => {
    let entidades = [], tiposProducto = [], catalogosCargados = false, historialMemoria = [];
    async function cargarCatalogos() {
        if (catalogosCargados && entidades.length > 0 && entidades[0] !== Config.DEFAULT_ERROR_ENTIDADES[0]) {
            EventManager.publish("catalogosCargados", { entidades, tiposProducto }); return;
        }
        Utils.toggleCargando(true, "Cargando catálogos...");
        try {
            const fetchEnt = fetch(Config.LOCAL_ENTIDADES_PATH).then(r => r.ok ? r.json() : Promise.reject(new Error(`Entidades: ${r.statusText}`))).catch(e => (Utils.mostrarNotificacion(e.message, "error", 6000), [...Config.DEFAULT_ERROR_ENTIDADES]));
            const fetchTipos = fetch(Config.LOCAL_TIPOS_PRODUCTO_PATH).then(r => r.ok ? r.json() : Promise.reject(new Error(`Tipos Prod: ${r.statusText}`))).catch(e => (Utils.mostrarNotificacion(e.message, "error", 6000), [...Config.DEFAULT_ERROR_TIPOS_PRODUCTO]));
            const [loadedEnt, loadedTipos] = await Promise.all([fetchEnt, fetchTipos]);
            entidades = Array.isArray(loadedEnt) ? loadedEnt : [...Config.DEFAULT_ERROR_ENTIDADES];
            tiposProducto = Array.isArray(loadedTipos) ? loadedTipos : [...Config.DEFAULT_ERROR_TIPOS_PRODUCTO];
            if (entidades[0] !== Config.DEFAULT_ERROR_ENTIDADES[0] && tiposProducto[0] !== Config.DEFAULT_ERROR_TIPOS_PRODUCTO[0]) {
                catalogosCargados = true; Utils.mostrarNotificacion("Catálogos cargados.", "success");
                EventManager.publish("catalogosCargados", { entidades, tiposProducto });
            } else { catalogosCargados = false; EventManager.publish("catalogosError", { entidades, tiposProducto }); }
        } catch (e) {
            Utils.mostrarNotificacion(`Error al cargar catálogos: ${e.message}.`, "error", 6000);
            entidades = [...Config.DEFAULT_ERROR_ENTIDADES]; tiposProducto = [...Config.DEFAULT_ERROR_TIPOS_PRODUCTO];
            catalogosCargados = false; EventManager.publish("catalogosError", { entidades, tiposProducto });
        }
        Utils.toggleCargando(false);
    }
    function getEntidades() { return [...entidades]; }
    function getTiposProducto() { return [...tiposProducto]; }
    function areCatalogosCargados() { return catalogosCargados; }
    function obtenerLimiteDescuento(tipo) { return Config.LIMITES_DESCUENTO[tipo] !== undefined ? Config.LIMITES_DESCUENTO[tipo] : 100; }
    function getHistorial() { return [...historialMemoria]; }
    function getContratoPorFolio(folio) { return historialMemoria.find(c => c.folio === folio); }
    function agregarOActualizarContratoHistorial(contrato) {
        const idx = historialMemoria.findIndex(c => c.folio === contrato.folio);
        if (idx !== -1) historialMemoria[idx] = contrato; else historialMemoria.push(contrato);
        EventManager.publish("historialActualizado", getHistorial());
    }
    function setHistorial(contratos) { historialMemoria = Array.isArray(contratos) ? contratos : []; EventManager.publish("historialActualizado", getHistorial()); }
    function limpiarHistorial() { historialMemoria = []; EventManager.publish("historialActualizado", getHistorial()); }
    return { cargarCatalogos, getEntidades, getTiposProducto, areCatalogosCargados, obtenerLimiteDescuento, getHistorial, getContratoPorFolio, agregarOActualizarContratoHistorial, setHistorial, limpiarHistorial };
})();

// ---------------------------------------
// CalculationService (Lógica de Negocio)
// ---------------------------------------
const CalculationService = (() => {
    function calcularImporteConDescuento(impDeuda, porcDesc) { return (isNaN(impDeuda) || isNaN(porcDesc)) ? 0 : impDeuda * (1 - porcDesc / 100); }
    function calcularTotalesPlan(deudas, numCuotas, nombreDeudor, folioExistente = null) {
        if (!Array.isArray(deudas) || deudas.length === 0) { Utils.mostrarNotificacion("No hay deudas para calcular.", "warning"); return null; }
        if (!nombreDeudor || nombreDeudor.trim() === "") { Utils.mostrarNotificacion("El nombre del cliente es obligatorio.", "error"); return null; }
        if (isNaN(numCuotas) || numCuotas < Config.MIN_CUOTAS || numCuotas > Config.MAX_CUOTAS) { Utils.mostrarNotificacion(`El número de cuotas debe estar entre ${Config.MIN_CUOTAS} y ${Config.MAX_CUOTAS}.`, "error"); return null; }
        let sumaOrigTotal = 0, sumaDescTotal = 0, deudasDet = [];
        for (const d of deudas) {
            const impOrig = parseFloat(d.importeDeuda), porcDesc = parseFloat(d.porcentajeDescuento);
            if (isNaN(impOrig) || impOrig <= 0) { Utils.mostrarNotificacion(`Importe inválido para contrato ${d.numeroContrato || "N/A"}.`, "error"); return null; }
            if (isNaN(porcDesc) || porcDesc < 0 || porcDesc > 100) { Utils.mostrarNotificacion(`Porcentaje de descuento inválido para contrato ${d.numeroContrato || "N/A"}.`, "error"); return null; }
            const limProd = DataService.obtenerLimiteDescuento(d.tipoProducto);
            if (porcDesc > limProd) { Utils.mostrarNotificacion(`Descuento para ${d.tipoProducto} (${d.numeroContrato || "N/A"}) excede el límite de ${limProd}%.`, "error"); return null; }
            sumaOrigTotal += impOrig;
            const impConDesc = calcularImporteConDescuento(impOrig, porcDesc);
            sumaDescTotal += impConDesc;
            deudasDet.push({ entidad: d.entidad, tipoProducto: d.tipoProducto, numeroContrato: d.numeroContrato, importeOriginal: impOrig, porcentajeDescuento: porcDesc, importeConDescuento: impConDesc });
        }
        const ahorro = sumaOrigTotal - sumaDescTotal;
        const comisionExitoBase = Config.COMISION_EXITO_PORCENTAJE * ahorro;
        const comisionExitoConIVA = comisionExitoBase * (1 + Config.IVA_PORCENTAJE);
        const extra10Base = Config.EXTRA_10_PORCENTAJE_DEUDA_ORIGINAL * sumaOrigTotal;
        const extra10ConIVA = extra10Base * (1 + Config.IVA_PORCENTAJE);
        const totalAPagarFinal = sumaDescTotal + comisionExitoConIVA + extra10ConIVA;
        if (totalAPagarFinal > sumaOrigTotal * Config.RESTRICCION_PAGO_MAXIMO_PORCENTAJE_DEUDA_ORIGINAL) {
            Utils.mostrarNotificacion(`El total a pagar (${Utils.formatoMoneda(totalAPagarFinal)}) excede el ${Config.RESTRICCION_PAGO_MAXIMO_PORCENTAJE_DEUDA_ORIGINAL * 100}% de la deuda original (${Utils.formatoMoneda(sumaOrigTotal * Config.RESTRICCION_PAGO_MAXIMO_PORCENTAJE_DEUDA_ORIGINAL)}). No se puede contratar.`, "error", 8000);
            return null;
        }
        const resultado = {
            nombreDeudor: nombreDeudor.trim(), sumaOriginalTotal: sumaOrigTotal, sumaDescontadaTotal: sumaDescTotal, ahorro,
            comisionExitoBase, comisionExitoConIVA, extra10Base, extra10ConIVA, totalAPagarFinal,
            numCuotas, cuotaMensual: totalAPagarFinal / numCuotas, deudasDetalladas: deudasDet,
            porcentajeDescuentoPromedio: sumaOrigTotal > 0 ? (ahorro / sumaOrigTotal) * 100 : 0,
            fechaCreacion: Utils.obtenerFechaActualFormateada(), folio: folioExistente || Utils.generarFolioUnico()
        };
        EventManager.publish("calculoCompletado", resultado);
        return resultado;
    }
    return { calcularTotalesPlan, calcularImporteConDescuento };
})();

// ---------------------------------------
// UIManager (Gestión de UI)
// ---------------------------------------
const UIManager = (() => {
    const dom = {}; let chartInstance = null; let folioEditando = null; let datosPlanActual = null;
    function cacheDOM() {
        const ids = [
            "nombreDeudor", "numCuotas", "btnAgregarFila", "tablaDeudas", "btnCalcular", "btnReAnalizar",
            "btnMostrarHistorial", "planContainerOuter", "plan-nombre-deudor", "plan-num-deudas",
            "plan-deuda-total", "plan-folio", "plan-fecha", "myChart", "plan-lo-que-debes",
            "plan-lo-que-pagarias", "plan-ahorro", "plan-duracion", "plan-cuota-mensual",
            "plan-descuento-total", "plan-tabla-body", "btnDescargarPlan", "btnExportarJSON",
            "btnContratar", "btnEditarContrato", "historialContainer", "btnCerrarHistorial",
            "inputCargarHistorial", "tablaHistorialBody", "currentYear", "indicadorCarga", "mensajeCarga"
        ];
        ids.forEach(id => {
            dom[id.replace(/-/g, "")] = document.getElementById(id);
            if (!dom[id.replace(/-/g, "")]) console.warn(`UIManager.cacheDOM: Elemento con ID '${id}' no encontrado.`);
        });
        // Alias para tablaDeudasBody por consistencia con el nombre original
        dom.tablaDeudasBody = dom.tablaDeudas;
        if (dom.currentYear) dom.currentYear.textContent = new Date().getFullYear();
    }
    function bindEvents() {
        if (dom.btnAgregarFila) dom.btnAgregarFila.addEventListener("click", () => { agregarFilaDeuda(); Utils.aplicarEfectoClick(dom.btnAgregarFila); });
        if (dom.btnCalcular) dom.btnCalcular.addEventListener("click", () => { EventManager.publish("calcularPlanSolicitado"); Utils.aplicarEfectoClick(dom.btnCalcular); });
        if (dom.btnReAnalizar) dom.btnReAnalizar.addEventListener("click", () => { reiniciarSimulador(); Utils.aplicarEfectoClick(dom.btnReAnalizar); });
        if (dom.btnMostrarHistorial) dom.btnMostrarHistorial.addEventListener("click", () => { mostrarHistorial(true); Utils.aplicarEfectoClick(dom.btnMostrarHistorial); });
        if (dom.btnCerrarHistorial) dom.btnCerrarHistorial.addEventListener("click", () => { mostrarHistorial(false); Utils.aplicarEfectoClick(dom.btnCerrarHistorial); });
        if (dom.btnDescargarPlan) dom.btnDescargarPlan.addEventListener("click", () => { EventManager.publish("descargarPDFsolicitado"); Utils.aplicarEfectoClick(dom.btnDescargarPlan); });
        if (dom.btnExportarJSON) dom.btnExportarJSON.addEventListener("click", () => { EventManager.publish("exportarJSONsolicitado"); Utils.aplicarEfectoClick(dom.btnExportarJSON); });
        if (dom.btnContratar) dom.btnContratar.addEventListener("click", () => { EventManager.publish("contratarPlanSolicitado"); Utils.aplicarEfectoClick(dom.btnContratar); });
        if (dom.btnEditarContrato) dom.btnEditarContrato.addEventListener("click", () => { EventManager.publish("editarContratoActualSolicitado"); Utils.aplicarEfectoClick(dom.btnEditarContrato); });
        if (dom.inputCargarHistorial) dom.inputCargarHistorial.addEventListener("change", (event) => EventManager.publish("cargarHistorialSolicitado", event));
        if (dom.tablaDeudasBody) {
            dom.tablaDeudasBody.addEventListener("input", Utils.debounce(e => {
                if (e.target.classList.contains("importe-deuda") || e.target.classList.contains("porcentaje-descuento")) {
                    const fila = e.target.closest("tr");
                    if (fila) _actualizarImporteFila(fila);
                }
            }, Config.DEBOUNCE_TIME));
            dom.tablaDeudasBody.addEventListener("change", e => { // Para select de tipo producto
                if (e.target.classList.contains("tipo-producto")) {
                    const fila = e.target.closest("tr");
                    if (fila) _actualizarImporteFila(fila); // Revalida descuento
                }
            });
        }
    }
    function _crearInput(type, className, value = "", placeholder = "", required = false, step = "any") {
        const input = document.createElement("input");
        input.type = type; input.className = className;
        if (type === "number") { input.step = step; input.min = "0"; }
        input.value = value; input.placeholder = placeholder; input.required = required;
        return input;
    }
    function _crearSelect(className, options, selectedValue = "") {
        const select = document.createElement("select");
        select.className = className;
        options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt; option.textContent = opt;
            if (opt === selectedValue) option.selected = true;
            select.appendChild(option);
        });
        return select;
    }
    function _crearBoton(className, textContent, onClick) {
        const button = document.createElement("button");
        button.type = "button"; button.className = className; button.textContent = textContent;
        button.addEventListener("click", onClick);
        return button;
    }
    function agregarFilaDeuda(deuda = null) {
        if (!dom.tablaDeudasBody) { Utils.mostrarNotificacion("Tabla de deudas no encontrada.", "error"); return; }
        const fila = dom.tablaDeudasBody.insertRow();
        fila.insertCell().appendChild(_crearInput("text", "numero-contrato", deuda ? deuda.numeroContrato : "", "Nº Contrato"));
        const tiposProd = DataService.getTiposProducto();
        if (tiposProd.length === 0 || tiposProd[0] === Config.DEFAULT_ERROR_TIPOS_PRODUCTO[0]) {
            Utils.mostrarNotificacion("Tipos de producto no cargados. Intente recargar.", "error");
            fila.insertCell().textContent = "Error al cargar tipos";
        } else {
            fila.insertCell().appendChild(_crearSelect("tipo-producto", tiposProd, deuda ? deuda.tipoProducto : tiposProd[0]));
        }
        const entidades = DataService.getEntidades();
        if (entidades.length === 0 || entidades[0] === Config.DEFAULT_ERROR_ENTIDADES[0]) {
            Utils.mostrarNotificacion("Entidades no cargadas. Intente recargar.", "error");
            fila.insertCell().textContent = "Error al cargar entidades";
        } else {
            fila.insertCell().appendChild(_crearSelect("entidad", entidades, deuda ? deuda.entidad : entidades[0]));
        }
        fila.insertCell().appendChild(_crearInput("number", "importe-deuda", deuda ? deuda.importeOriginal : "", "Importe", true));
        fila.insertCell().appendChild(_crearInput("number", "porcentaje-descuento", deuda ? deuda.porcentajeDescuento : "0", "% Desc.", true));
        const importeDescInput = _crearInput("text", "importe-descuento", "", "Automático", false);
        importeDescInput.readOnly = true;
        fila.insertCell().appendChild(importeDescInput);
        fila.insertCell().appendChild(_crearBoton("btn-eliminar-fila", "Eliminar", () => fila.remove()));
        if (deuda) _actualizarImporteFila(fila);
    }
    function _actualizarImporteFila(fila) {
        const importeInput = fila.querySelector(".importe-deuda");
        const descuentoInput = fila.querySelector(".porcentaje-descuento");
        const tipoProductoSelect = fila.querySelector(".tipo-producto");
        const importeDescOutput = fila.querySelector(".importe-descuento");
        if (!importeInput || !descuentoInput || !tipoProductoSelect || !importeDescOutput) return;
        let importe = parseFloat(importeInput.value);
        let descuento = parseFloat(descuentoInput.value);
        const tipoProducto = tipoProductoSelect.value;
        const limiteDescuento = DataService.obtenerLimiteDescuento(tipoProducto);
        if (descuento > limiteDescuento) {
            Utils.mostrarNotificacion(`El descuento para ${tipoProducto} no puede exceder ${limiteDescuento}%. Se ajustará.`, "warning");
            descuento = limiteDescuento;
            descuentoInput.value = descuento;
        }
        if (isNaN(importe) || isNaN(descuento)) {
            importeDescOutput.value = Utils.formatoMoneda(0);
        } else {
            const calculado = CalculationService.calcularImporteConDescuento(importe, descuento);
            importeDescOutput.value = Utils.formatoMoneda(calculado);
        }
    }
    function recolectarDatosDeudas() {
        if (!dom.tablaDeudasBody) return [];
        return Array.from(dom.tablaDeudasBody.rows).map(fila => ({
            numeroContrato: fila.cells[0].querySelector("input").value,
            tipoProducto: fila.cells[1].querySelector("select").value,
            entidad: fila.cells[2].querySelector("select").value,
            importeDeuda: fila.cells[3].querySelector("input").value,
            porcentajeDescuento: fila.cells[4].querySelector("input").value
        }));
    }
    function mostrarResultados(datos) {
        datosPlanActual = datos; // Guardar para PDF/JSON
        if (!dom.planContainerOuter || !datos) { Utils.mostrarNotificacion("Error al mostrar resultados.", "error"); return; }
        dom.planContainerOuter.style.display = "block";
        if (dom.planNombreDeudor) dom.planNombreDeudor.textContent = datos.nombreDeudor;
        if (dom.planNumDeudas) dom.planNumDeudas.textContent = datos.deudasDetalladas.length;
        if (dom.planDeudaTotal) dom.planDeudaTotal.textContent = Utils.formatoMoneda(datos.sumaOriginalTotal);
        if (dom.planFolio) dom.planFolio.textContent = datos.folio;
        if (dom.planFecha) dom.planFecha.textContent = datos.fechaCreacion;
        if (dom.planLoQueDebes) dom.planLoQueDebes.textContent = Utils.formatoMoneda(datos.sumaOriginalTotal);
        if (dom.planLoQuePagarias) dom.planLoQuePagarias.textContent = Utils.formatoMoneda(datos.totalAPagarFinal);
        if (dom.planAhorro) dom.planAhorro.textContent = Utils.formatoMoneda(datos.ahorro);
        if (dom.planDuracion) dom.planDuracion.textContent = `${datos.numCuotas} meses`;
        if (dom.planCuotaMensual) dom.planCuotaMensual.textContent = Utils.formatoMoneda(datos.cuotaMensual);
        if (dom.planDescuentoTotal) dom.planDescuentoTotal.textContent = `${datos.porcentajeDescuentoPromedio.toFixed(2)}%`;
        if (dom.planTablaBody) {
            dom.planTablaBody.innerHTML = "";
            datos.deudasDetalladas.forEach(d => {
                const fila = dom.planTablaBody.insertRow();
                fila.insertCell().textContent = d.numeroContrato || "N/A";
                fila.insertCell().textContent = d.tipoProducto;
                fila.insertCell().textContent = d.entidad;
                fila.insertCell().textContent = Utils.formatoMoneda(d.importeOriginal);
                fila.insertCell().textContent = `${d.porcentajeDescuento}%`;
                fila.insertCell().textContent = Utils.formatoMoneda(d.importeConDescuento);
            });
        }
        if (dom.myChart) {
            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(dom.myChart.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: ["Total a Pagar", "Ahorro Total"],
                    datasets: [{
                        label: "Distribución de Deuda",
                        data: [datos.totalAPagarFinal, datos.ahorro],
                        backgroundColor: [Config.CHART_COLORS.TOTAL_A_PAGAR, Config.CHART_COLORS.AHORRO_TOTAL],
                        hoverOffset: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom" } } }
            });
        }
        if (dom.btnDescargarPlan) dom.btnDescargarPlan.disabled = false;
        if (dom.btnExportarJSON) dom.btnExportarJSON.disabled = false;
        if (dom.btnContratar) dom.btnContratar.disabled = false;
        if (dom.btnEditarContrato) dom.btnEditarContrato.style.display = "inline-block";
        Utils.mostrarNotificacion("Plan calculado exitosamente.", "success");
        dom.planContainerOuter.scrollIntoView({ behavior: "smooth" });
    }
    function reiniciarSimulador() {
        if (dom.nombreDeudor) dom.nombreDeudor.value = "";
        if (dom.numCuotas) dom.numCuotas.value = Config.DEFAULT_NUM_CUOTAS;
        if (dom.tablaDeudasBody) dom.tablaDeudasBody.innerHTML = "";
        if (dom.planContainerOuter) dom.planContainerOuter.style.display = "none";
        if (dom.btnDescargarPlan) dom.btnDescargarPlan.disabled = true;
        if (dom.btnExportarJSON) dom.btnExportarJSON.disabled = true;
        if (dom.btnContratar) dom.btnContratar.disabled = true;
        if (dom.btnEditarContrato) dom.btnEditarContrato.style.display = "none";
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
        datosPlanActual = null; folioEditando = null;
        agregarFilaDeuda(); // Añade una fila inicial
        Utils.mostrarNotificacion("Simulador reiniciado.", "info");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function actualizarSelectoresConCatalogos({ entidades, tiposProducto }) {
        document.querySelectorAll(".tipo-producto").forEach(select => {
            const valorActual = select.value;
            select.innerHTML = "";
            tiposProducto.forEach(tipo => { const opt = document.createElement("option"); opt.value = tipo; opt.textContent = tipo; select.appendChild(opt); });
            if (tiposProducto.includes(valorActual)) select.value = valorActual; else if (tiposProducto.length > 0) select.value = tiposProducto[0];
        });
        document.querySelectorAll(".entidad").forEach(select => {
            const valorActual = select.value;
            select.innerHTML = "";
            entidades.forEach(ent => { const opt = document.createElement("option"); opt.value = ent; opt.textContent = ent; select.appendChild(opt); });
            if (entidades.includes(valorActual)) select.value = valorActual; else if (entidades.length > 0) select.value = entidades[0];
        });
        // Si la tabla está vacía después de cargar catálogos, agregar una fila inicial
        if (dom.tablaDeudasBody && dom.tablaDeudasBody.rows.length === 0) {
            agregarFilaDeuda();
        }
    }
    function mostrarHistorial(mostrar) {
        if (dom.historialContainer) {
            dom.historialContainer.style.display = mostrar ? "block" : "none";
            if (mostrar) { EventManager.publish("historialSolicitado"); dom.historialContainer.scrollIntoView({ behavior: "smooth" }); }
        }
    }
    function renderizarHistorial(historial) {
        if (!dom.tablaHistorialBody) { Utils.mostrarNotificacion("Tabla de historial no encontrada.", "error"); return; }
        dom.tablaHistorialBody.innerHTML = "";
        if (!historial || historial.length === 0) {
            const fila = dom.tablaHistorialBody.insertRow();
            const celda = fila.insertCell(); celda.colSpan = 5; celda.textContent = "No hay contratos en el historial.";
            return;
        }
        // Mostrar solo los últimos N o un resumen si es muy largo
        const historialAMostrar = historial.length > Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY ? historial.slice(-Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY) : historial;
        if (historial.length > Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY) {
            Utils.mostrarNotificacion(`Mostrando los últimos ${Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY} de ${historial.length} contratos.`, "info");
        }
        historialAMostrar.sort((a, b) => (b.folio || "").localeCompare(a.folio || "")); // Ordenar por folio descendente (más recientes primero)
        historialAMostrar.forEach(contrato => {
            const fila = dom.tablaHistorialBody.insertRow();
            fila.insertCell().textContent = contrato.folio || "N/A";
            fila.insertCell().textContent = contrato.nombreDeudor || "N/A";
            fila.insertCell().textContent = contrato.fechaCreacion || "N/A";
            fila.insertCell().textContent = Utils.formatoMoneda(contrato.totalAPagarFinal || 0);
            const celdaAcciones = fila.insertCell();
            celdaAcciones.appendChild(_crearBoton("btn-cargar-historial", "Cargar", () => EventManager.publish("cargarContratoDesdeHistorialSolicitado", contrato.folio)));
        });
    }
    function cargarContratoAlFormulario(contrato) {
        if (!contrato) { Utils.mostrarNotificacion("No se pudo cargar el contrato.", "error"); return; }
        reiniciarSimulador(); // Limpia el formulario primero
        if (dom.nombreDeudor) dom.nombreDeudor.value = contrato.nombreDeudor;
        if (dom.numCuotas) dom.numCuotas.value = contrato.numCuotas;
        if (dom.tablaDeudasBody) dom.tablaDeudasBody.innerHTML = ""; // Limpiar filas de deuda existentes
        contrato.deudasDetalladas.forEach(deuda => agregarFilaDeuda(deuda));
        folioEditando = contrato.folio; // Marcar que estamos editando este folio
        // Calcular y mostrar el plan para que el usuario vea los resultados
        EventManager.publish("calcularPlanSolicitado");
        Utils.mostrarNotificacion(`Contrato ${contrato.folio} cargado para edición.`, "info");
        mostrarHistorial(false); // Ocultar panel de historial
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function getDatosPlanActual() { return datosPlanActual; }
    function getFolioEditando() { return folioEditando; }
    function init() {
        cacheDOM();
        bindEvents();
        reiniciarSimulador(); // Estado inicial limpio con una fila
    }
    return { init, recolectarDatosDeudas, mostrarResultados, reiniciarSimulador, actualizarSelectoresConCatalogos, mostrarHistorial, renderizarHistorial, cargarContratoAlFormulario, getDatosPlanActual, getFolioEditando };
})();

// ---------------------------------------
// PDFService (Generación de PDF)
// ---------------------------------------
const PDFService = (() => {
    async function generarPDF(datosPlan) {
        if (!datosPlan) { Utils.mostrarNotificacion("No hay datos del plan para generar PDF.", "warning"); return; }
        const elemento = document.getElementById("planContainerOuter");
        if (!elemento) { Utils.mostrarNotificacion("Contenedor del plan no encontrado para PDF.", "error"); return; }
        Utils.toggleCargando(true, "Generando PDF...");
        const nombreArchivo = `${datosPlan.nombreDeudor.replace(/\s+/g, "_")}_${datosPlan.fechaCreacion.replace(/\//g, "-")}_${datosPlan.folio.substring(0, 8)}.pdf`;
        const opt = {
            margin: [5, 5, 5, 5],
            filename: nombreArchivo,
            image: { type: "jpeg", quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: elemento.scrollWidth, windowHeight: elemento.scrollHeight },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] }
        };
        try {
            const originalDisplay = elemento.style.display;
            if (elemento.style.display === 'none') elemento.style.display = 'block';
            await html2pdf().from(elemento).set(opt).save();
            Utils.mostrarNotificacion("PDF generado y descargado.", "success");
            if (elemento.style.display !== originalDisplay) elemento.style.display = originalDisplay;
        } catch (e) {
            Utils.mostrarNotificacion(`Error al generar PDF: ${e.message}`, "error");
            console.error("Error en generarPDF:", e);
        } finally {
            Utils.toggleCargando(false);
        }
    }
    return { generarPDF };
})();

// ---------------------------------------
// JSONService (Manejo de JSON)
// ---------------------------------------
const JSONService = (() => {
    async function descargarJSON(data, nombreArchivo) {
        if (!data) { Utils.mostrarNotificacion("No hay datos para exportar.", "warning"); return; }
        Utils.toggleCargando(true, "Exportando JSON...");
        try {
            await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña demora para visibilidad del loader
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = nombreArchivo; document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
            Utils.mostrarNotificacion(`${nombreArchivo} exportado.`, "success");
        } catch (e) {
            Utils.mostrarNotificacion(`Error al exportar JSON: ${e.message}`, "error");
            console.error("Error en descargarJSON:", e);
        } finally {
            Utils.toggleCargando(false);
        }
    }
    async function leerArchivoJSON(file) {
        Utils.toggleCargando(true, "Cargando archivo JSON...");
        try {
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => {
                    try { resolve(JSON.parse(e.target.result)); }
                    catch (err) { Utils.mostrarNotificacion(`Error al parsear JSON: ${err.message}`, "error"); reject(err); }
                };
                reader.onerror = e => {
                    Utils.mostrarNotificacion(`Error al leer archivo: ${e.target.error.name}`, "error");
                    reject(new Error("Error al leer archivo: " + e.target.error.name));
                };
                reader.readAsText(file);
            });
        } catch (error) {
            Utils.mostrarNotificacion(`Error procesando archivo JSON: ${error.message}`, "error");
            throw error;
        } finally {
            Utils.toggleCargando(false);
        }
    }
    return { descargarJSON, leerArchivoJSON };
})();

// ---------------------------------------
// AppController (Controlador Principal)
// ---------------------------------------
const AppController = (() => {
    let planCalculadoActual = null;
    function init() {
        UIManager.init();
        DataService.cargarCatalogos();
        // Suscripciones a eventos
        EventManager.subscribe("catalogosCargados", UIManager.actualizarSelectoresConCatalogos);
        EventManager.subscribe("catalogosError", UIManager.actualizarSelectoresConCatalogos); // Aún así intentar poblar con errores
        EventManager.subscribe("calcularPlanSolicitado", handleCalcularPlan);
        EventManager.subscribe("calculoCompletado", (datos) => { planCalculadoActual = datos; UIManager.mostrarResultados(datos); });
        EventManager.subscribe("descargarPDFsolicitado", () => { if (planCalculadoActual) PDFService.generarPDF(planCalculadoActual); else Utils.mostrarNotificacion("Primero calcula un plan.", "info"); });
        EventManager.subscribe("exportarJSONsolicitado", () => { if (planCalculadoActual) JSONService.descargarJSON(planCalculadoActual, `${planCalculadoActual.nombreDeudor.replace(/\s+/g, "_")}_Plan_${planCalculadoActual.folio.substring(0,8)}.json`); else Utils.mostrarNotificacion("Primero calcula un plan.", "info"); });
        EventManager.subscribe("contratarPlanSolicitado", handleContratarPlan);
        EventManager.subscribe("editarContratoActualSolicitado", handleEditarContratoActual);
        EventManager.subscribe("historialSolicitado", () => UIManager.renderizarHistorial(DataService.getHistorial()));
        EventManager.subscribe("historialActualizado", UIManager.renderizarHistorial);
        EventManager.subscribe("cargarHistorialSolicitado", handleCargarHistorial);
        EventManager.subscribe("cargarContratoDesdeHistorialSolicitado", (folio) => {
            const contrato = DataService.getContratoPorFolio(folio);
            if (contrato) UIManager.cargarContratoAlFormulario(contrato);
            else Utils.mostrarNotificacion("Contrato no encontrado en historial.", "error");
        });
    }
    function handleCalcularPlan() {
        if (!UIManager.dom.nombreDeudor || !UIManager.dom.numCuotas) { Utils.mostrarNotificacion("Elementos del formulario no encontrados.", "error"); return; }
        const nombreDeudor = UIManager.dom.nombreDeudor.value;
        const numCuotas = parseInt(UIManager.dom.numCuotas.value, 10);
        const deudas = UIManager.recolectarDatosDeudas();
        const folioEditando = UIManager.getFolioEditando();
        planCalculadoActual = CalculationService.calcularTotalesPlan(deudas, numCuotas, nombreDeudor, folioEditando);
        // La publicación de "calculoCompletado" y mostrarResultados se hace dentro de calcularTotalesPlan si es exitoso.
    }
    async function handleContratarPlan() {
        if (!planCalculadoActual) { Utils.mostrarNotificacion("Primero calcula un plan válido para contratar.", "info"); return; }
        Utils.confirmarAccion("¿Estás seguro de que deseas formalizar este contrato? Esta acción guardará los datos.", async () => {
            DataService.agregarOActualizarContratoHistorial(planCalculadoActual);
            // Para simular guardado local, descargamos el JSON.
            // En un entorno real, aquí se enviaría a un backend o se guardaría en localStorage/IndexedDB de forma más persistente.
            await JSONService.descargarJSON(planCalculadoActual, `CONTRATO_${planCalculadoActual.nombreDeudor.replace(/\s+/g, "_")}_${planCalculadoActual.folio}.json`);
            Utils.mostrarNotificacion(`Contrato ${planCalculadoActual.folio} formalizado y guardado en el historial.`, "success");
            // Podríamos deshabilitar la edición después de contratar, o permitir versiones.
            // Por ahora, simplemente lo dejamos como está y se puede volver a editar/calcular.
        });
    }
    function handleEditarContratoActual() {
        if (!planCalculadoActual) { Utils.mostrarNotificacion("No hay plan actual para editar.", "info"); return; }
        // Simplemente permite que el formulario sea editable de nuevo, ya que no lo bloqueamos.
        // El folio se mantiene para que al recalcular se actualice el mismo contrato.
        UIManager.dom.planContainerOuter.style.display = 'none'; // Ocultar resultados para forzar recálculo
        UIManager.dom.btnDescargarPlan.disabled = true;
        UIManager.dom.btnExportarJSON.disabled = true;
        UIManager.dom.btnContratar.disabled = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
        Utils.mostrarNotificacion("Puedes editar los datos del formulario y recalcular.", "info");
    }
    async function handleCargarHistorial(event) {
        const files = event.target.files;
        if (!files || files.length === 0) { Utils.mostrarNotificacion("No se seleccionaron archivos.", "info"); return; }
        Utils.toggleCargando(true, "Cargando historial...");
        try {
            const promesasLectura = Array.from(files).map(file => JSONService.leerArchivoJSON(file));
            const contenidos = await Promise.all(promesasLectura);
            const contratosNuevos = contenidos.flat().filter(c => c && c.folio);
            if (contratosNuevos.length > 0) {
                const historialActual = DataService.getHistorial();
                const contratosUnicos = [...historialActual];
                contratosNuevos.forEach(cn => { if (!historialActual.some(ha => ha.folio === cn.folio)) contratosUnicos.push(cn); });
                DataService.setHistorial(contratosUnicos);
                Utils.mostrarNotificacion(`${contratosNuevos.length} contrato(s) procesado(s) y añadido(s) al historial.`, "success");
            } else { Utils.mostrarNotificacion("No se encontraron contratos válidos en los archivos.", "warning"); }
        } catch (error) {
            Utils.mostrarNotificacion(`Error al cargar historial: ${error.message}`, "error");
            console.error("Error cargando historial:", error);
        } finally {
            if (event.target) event.target.value = "";
            Utils.toggleCargando(false);
        }
    }
    return { init };
})();

// Inicialización de la aplicación
document.addEventListener("DOMContentLoaded", AppController.init);

