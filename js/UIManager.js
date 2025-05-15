import { Config } from "./Config.js";
import { Utils } from "./Utils.js";
import { EventManager } from "./EventManager.js";
import { DataService } from "./DataService.js";
import { CalculationService } from "./CalculationService.js";

export const UIManager = (() => {
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
        dom.tablaDeudasBody = dom.tablaDeudas; // Assuming tablaDeudas is the tbody element
        if (dom.currentYear) dom.currentYear.textContent = new Date().getFullYear();
    }
    function getDOM() { return dom; } // Getter for cached DOM elements

    function bindEvents() {
        const $ = getDOM(); // Use local getter
        if ($.btnAgregarFila) $.btnAgregarFila.addEventListener("click", () => { agregarFilaDeuda(); Utils.aplicarEfectoClick($.btnAgregarFila); });
        if ($.btnCalcular) $.btnCalcular.addEventListener("click", () => { EventManager.publish("calcularPlanSolicitado"); Utils.aplicarEfectoClick($.btnCalcular); });
        if ($.btnReAnalizar) $.btnReAnalizar.addEventListener("click", () => { reiniciarSimulador(); Utils.aplicarEfectoClick($.btnReAnalizar); });
        if ($.btnMostrarHistorial) $.btnMostrarHistorial.addEventListener("click", () => { mostrarHistorial(true); Utils.aplicarEfectoClick($.btnMostrarHistorial); });
        if ($.btnCerrarHistorial) $.btnCerrarHistorial.addEventListener("click", () => { mostrarHistorial(false); Utils.aplicarEfectoClick($.btnCerrarHistorial); });
        if ($.btnDescargarPlan) $.btnDescargarPlan.addEventListener("click", () => { EventManager.publish("descargarPDFsolicitado"); Utils.aplicarEfectoClick($.btnDescargarPlan); });
        if ($.btnExportarJSON) $.btnExportarJSON.addEventListener("click", () => { EventManager.publish("exportarJSONsolicitado"); Utils.aplicarEfectoClick($.btnExportarJSON); });
        if ($.btnContratar) $.btnContratar.addEventListener("click", () => { EventManager.publish("contratarPlanSolicitado"); Utils.aplicarEfectoClick($.btnContratar); });
        if ($.btnEditarContrato) $.btnEditarContrato.addEventListener("click", () => { EventManager.publish("editarContratoActualSolicitado"); Utils.aplicarEfectoClick($.btnEditarContrato); });
        if ($.inputCargarHistorial) $.inputCargarHistorial.addEventListener("change", (event) => EventManager.publish("cargarHistorialSolicitado", event));
        
        if ($.tablaDeudasBody) {
            $.tablaDeudasBody.addEventListener("input", Utils.debounce(e => {
                if (e.target.classList.contains("importe-deuda") || e.target.classList.contains("porcentaje-descuento")) {
                    const fila = e.target.closest("tr");
                    if (fila) _actualizarImporteFila(fila);
                }
            }, Config.DEBOUNCE_TIME));
            $.tablaDeudasBody.addEventListener("change", e => {
                if (e.target.classList.contains("tipo-producto")) {
                    const fila = e.target.closest("tr");
                    if (fila) _actualizarImporteFila(fila); 
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
    function _crearSelect(className, options, selectedValue = "", disabled = false) {
        const select = document.createElement("select");
        select.className = className;
        select.disabled = disabled;
        if (options.length === 0 || (options.length === 1 && options[0].startsWith("…"))) {
            const option = document.createElement("option");
            option.value = ""; option.textContent = options.length ? options[0] : "Error";
            select.appendChild(option);
        } else {
            options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt; option.textContent = opt;
                if (opt === selectedValue) option.selected = true;
                select.appendChild(option);
            });
        }
        return select;
    }
    function _crearBoton(className, textContent, onClick) {
        const button = document.createElement("button");
        button.type = "button"; button.className = className; button.textContent = textContent;
        button.addEventListener("click", onClick);
        return button;
    }
    function agregarFilaDeuda(deuda = null) {
        const $ = getDOM();
        if (!$.tablaDeudasBody) { Utils.mostrarNotificacion("Tabla de deudas no encontrada.", "error"); return; }
        const fila = $.tablaDeudasBody.insertRow();
        fila.insertCell().appendChild(_crearInput("text", "numero-contrato", deuda ? deuda.numeroContrato : "", "Nº Contrato"));
        
        const catalogosListos = DataService.areCatalogosCargados();
        const tiposProd = catalogosListos ? DataService.getTiposProducto() : Config.DEFAULT_ERROR_TIPOS_PRODUCTO;
        const entidades = catalogosListos ? DataService.getEntidades() : Config.DEFAULT_ERROR_ENTIDADES;

        const selTipoProd = _crearSelect("tipo-producto", tiposProd, deuda ? deuda.tipoProducto : (tiposProd[0] || ""), !catalogosListos);
        fila.insertCell().appendChild(selTipoProd);

        const selEntidad = _crearSelect("entidad", entidades, deuda ? deuda.entidad : (entidades[0] || ""), !catalogosListos);
        fila.insertCell().appendChild(selEntidad);
        
        fila.insertCell().appendChild(_crearInput("number", "importe-deuda", deuda ? deuda.importeOriginal : "", "Importe", true));
        fila.insertCell().appendChild(_crearInput("number", "porcentaje-descuento", deuda ? deuda.porcentajeDescuento : "0", "% Desc.", true));
        const importeDescInput = _crearInput("text", "importe-descuento", "", "Automático", false);
        importeDescInput.readOnly = true;
        fila.insertCell().appendChild(importeDescInput);
        fila.insertCell().appendChild(_crearBoton("btn-eliminar-fila", "Eliminar", () => fila.remove()));
        if (deuda) _actualizarImporteFila(fila);
    }
    function actualizarSelectoresConCatalogos(data) {
        const $ = getDOM();
        if (!$.tablaDeudasBody) return;
        const { entidades, tiposProducto } = data;
        Array.from($.tablaDeudasBody.rows).forEach(fila => {
            const selTipo = fila.querySelector("select.tipo-producto");
            const selEnt = fila.querySelector("select.entidad");
            if (selTipo) {
                const currentValue = selTipo.value;
                selTipo.innerHTML = ""; // Clear existing options
                tiposProducto.forEach(opt => {
                    const option = document.createElement("option");
                    option.value = opt; option.textContent = opt;
                    if (opt === currentValue) option.selected = true;
                    selTipo.appendChild(option);
                });
                selTipo.disabled = false;
                if (!tiposProducto.includes(currentValue) && tiposProducto.length > 0) selTipo.value = tiposProducto[0];
            }
            if (selEnt) {
                const currentValue = selEnt.value;
                selEnt.innerHTML = ""; // Clear existing options
                entidades.forEach(opt => {
                    const option = document.createElement("option");
                    option.value = opt; option.textContent = opt;
                    if (opt === currentValue) option.selected = true;
                    selEnt.appendChild(option);
                });
                selEnt.disabled = false;
                if (!entidades.includes(currentValue) && entidades.length > 0) selEnt.value = entidades[0];
            }
        });
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
        const $ = getDOM();
        if (!$.tablaDeudasBody) return [];
        return Array.from($.tablaDeudasBody.rows).map(fila => {
            const numContratoEl = fila.cells[0].querySelector("input");
            const tipoProdEl = fila.cells[1].querySelector("select");
            const entidadEl = fila.cells[2].querySelector("select");
            const importeDeudaEl = fila.cells[3].querySelector("input");
            const porcDescEl = fila.cells[4].querySelector("input");
            return {
                numeroContrato: numContratoEl ? numContratoEl.value : "",
                tipoProducto: tipoProdEl ? tipoProdEl.value : "",
                entidad: entidadEl ? entidadEl.value : "",
                importeDeuda: importeDeudaEl ? importeDeudaEl.value : "0",
                porcentajeDescuento: porcDescEl ? porcDescEl.value : "0"
            };
        });
    }
    function mostrarResultados(datos) {
        datosPlanActual = datos;
        const $ = getDOM();
        if (!$.planContainerOuter || !datos) { Utils.mostrarNotificacion("Error al mostrar resultados.", "error"); return; }
        $.planContainerOuter.style.display = "block";
        if ($.planNombreDeudor) $.planNombreDeudor.textContent = datos.nombreDeudor;
        if ($.planNumDeudas) $.planNumDeudas.textContent = datos.deudasDetalladas.length;
        if ($.planDeudaTotal) $.planDeudaTotal.textContent = Utils.formatoMoneda(datos.sumaOriginalTotal);
        if ($.planFolio) $.planFolio.textContent = datos.folio;
        if ($.planFecha) $.planFecha.textContent = datos.fechaCreacion;
        if ($.planLoQueDebes) $.planLoQueDebes.textContent = Utils.formatoMoneda(datos.sumaOriginalTotal);
        if ($.planLoQuePagarias) $.planLoQuePagarias.textContent = Utils.formatoMoneda(datos.totalAPagarFinal);
        if ($.planAhorro) $.planAhorro.textContent = Utils.formatoMoneda(datos.ahorro);
        if ($.planDuracion) $.planDuracion.textContent = `${datos.numCuotas} meses`;
        if ($.planCuotaMensual) $.planCuotaMensual.textContent = Utils.formatoMoneda(datos.cuotaMensual);
        if ($.planDescuentoTotal) $.planDescuentoTotal.textContent = `${datos.porcentajeDescuentoPromedio.toFixed(2)}%`;
        if ($.planTablaBody) {
            $.planTablaBody.innerHTML = "";
            datos.deudasDetalladas.forEach(d => {
                const fila = $.planTablaBody.insertRow();
                fila.insertCell().textContent = d.numeroContrato || "N/A";
                fila.insertCell().textContent = d.tipoProducto;
                fila.insertCell().textContent = d.entidad;
                fila.insertCell().textContent = Utils.formatoMoneda(d.importeOriginal);
                fila.insertCell().textContent = `${d.porcentajeDescuento}%`;
                fila.insertCell().textContent = Utils.formatoMoneda(d.importeConDescuento);
            });
        }
        if ($.myChart) {
            if (chartInstance) chartInstance.destroy();
            try {
                chartInstance = new Chart($.myChart.getContext("2d"), {
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
                    options: { responsive: true, maintainAspectRatio: false, cutout: "70%" }
                });
            } catch (e) { console.error("Error creating chart:", e); Utils.mostrarNotificacion("Error al generar gráfico.", "error"); }
        }
        if ($.btnContratar) $.btnContratar.disabled = false;
        if ($.btnDescargarPlan) $.btnDescargarPlan.disabled = false;
        if ($.btnExportarJSON) $.btnExportarJSON.disabled = false;
        if ($.btnEditarContrato) $.btnEditarContrato.style.display = "inline-block";
        $.planContainerOuter.scrollIntoView({ behavior: "smooth" });
    }
    function reiniciarSimulador(cargarDeuda = null) {
        const $ = getDOM();
        folioEditando = null; datosPlanActual = null;
        if ($.nombreDeudor) $.nombreDeudor.value = "";
        if ($.numCuotas) $.numCuotas.value = Config.DEFAULT_NUM_CUOTAS;
        if ($.tablaDeudasBody) $.tablaDeudasBody.innerHTML = "";
        if ($.planContainerOuter) $.planContainerOuter.style.display = "none";
        if ($.btnContratar) $.btnContratar.disabled = true;
        if ($.btnDescargarPlan) $.btnDescargarPlan.disabled = true;
        if ($.btnExportarJSON) $.btnExportarJSON.disabled = true;
        if ($.btnEditarContrato) $.btnEditarContrato.style.display = "none";
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
        if (cargarDeuda && cargarDeuda.deudasDetalladas) {
            folioEditando = cargarDeuda.folio;
            if ($.nombreDeudor) $.nombreDeudor.value = cargarDeuda.nombreDeudor;
            if ($.numCuotas) $.numCuotas.value = cargarDeuda.numCuotas;
            cargarDeuda.deudasDetalladas.forEach(d => agregarFilaDeuda(d));
            Utils.mostrarNotificacion(`Editando contrato: ${cargarDeuda.folio}`, "info");
        } else {
            agregarFilaDeuda(); // Add one initial empty row
        }
        if ($.nombreDeudor) $.nombreDeudor.focus();
    }
    function mostrarHistorial(mostrar) {
        const $ = getDOM();
        if ($.historialContainer) $.historialContainer.style.display = mostrar ? "block" : "none";
        if (mostrar) EventManager.publish("historialSolicitado");
    }
    function renderizarHistorial(historial) {
        const $ = getDOM();
        if (!$.tablaHistorialBody) { Utils.mostrarNotificacion("Tabla de historial no encontrada.", "error"); return; }
        $.tablaHistorialBody.innerHTML = "";
        if (!Array.isArray(historial) || historial.length === 0) {
            const fila = $.tablaHistorialBody.insertRow();
            const celda = fila.insertCell();
            celda.colSpan = 6; celda.textContent = "No hay contratos guardados.";
            return;
        }
        const historialAMostrar = historial.length > Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY ? historial.slice(-Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY) : historial;
        if (historial.length > Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY) {
            Utils.mostrarNotificacion(`Mostrando los últimos ${Config.MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY} de ${historial.length} contratos.`, "info");
        }
        historialAMostrar.reverse().forEach(contrato => {
            const fila = $.tablaHistorialBody.insertRow();
            fila.insertCell().textContent = contrato.folio;
            fila.insertCell().textContent = contrato.fechaCreacion;
            fila.insertCell().textContent = contrato.nombreDeudor;
            fila.insertCell().textContent = Utils.formatoMoneda(contrato.totalAPagarFinal);
            fila.insertCell().textContent = `${contrato.numCuotas} (${Utils.formatoMoneda(contrato.cuotaMensual)})`;
            const acciones = fila.insertCell();
            acciones.appendChild(_crearBoton("btn-ver-hist", "Ver", () => {
                mostrarResultados(contrato);
                mostrarHistorial(false);
                Utils.aplicarEfectoClick(acciones.querySelector(".btn-ver-hist"));
            }));
            acciones.appendChild(_crearBoton("btn-editar-hist", "Editar", () => {
                reiniciarSimulador(contrato);
                mostrarHistorial(false);
                Utils.aplicarEfectoClick(acciones.querySelector(".btn-editar-hist"));
            }));
        });
    }
    function getDatosPlanActual() { return datosPlanActual; }
    function getFolioEditando() { return folioEditando; }

    return {
        cacheDOM, bindEvents, agregarFilaDeuda, recolectarDatosDeudas, mostrarResultados,
        reiniciarSimulador, mostrarHistorial, renderizarHistorial, getDatosPlanActual,
        getFolioEditando, actualizarSelectoresConCatalogos, getDOM // Expose getDOM
    };
})();
