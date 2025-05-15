import { Config } from "./Config.js";
import { Utils } from "./Utils.js";
import { EventManager } from "./EventManager.js";
import { DataService } from "./DataService.js";

export const CalculationService = (() => {
    function calcularImporteConDescuento(impDeuda, porcDesc) {
        // Ensure inputs are numbers before calculation
        const importeDeudaNum = Number(impDeuda);
        const porcentajeDescuentoNum = Number(porcDesc);
        if (Number.isNaN(importeDeudaNum) || Number.isNaN(porcentajeDescuentoNum)) return 0;
        return importeDeudaNum * (1 - porcentajeDescuentoNum / 100);
    }

    function calcularTotalesPlan(deudas, numCuotas, nombreDeudor, folioExistente = null) {
        if (!Array.isArray(deudas) || deudas.length === 0) {
            Utils.mostrarNotificacion("No hay deudas para calcular.", "warning");
            return null;
        }
        if (!nombreDeudor || nombreDeudor.trim() === "") {
            Utils.mostrarNotificacion("El nombre del cliente es obligatorio.", "error");
            return null;
        }
        const numCuotasParsed = Number(numCuotas);
        if (Number.isNaN(numCuotasParsed) || numCuotasParsed < Config.MIN_CUOTAS || numCuotasParsed > Config.MAX_CUOTAS) {
            Utils.mostrarNotificacion(`El número de cuotas debe estar entre ${Config.MIN_CUOTAS} y ${Config.MAX_CUOTAS}.`, "error");
            return null;
        }

        let sumaOrigTotal = 0;
        let sumaDescTotal = 0;
        const deudasDet = []; // Changed to const as it's only pushed to

        for (const d of deudas) {
            const impOrig = Number(d.importeDeuda);
            const porcDesc = Number(d.porcentajeDescuento);

            if (Number.isNaN(impOrig) || impOrig <= 0) {
                Utils.mostrarNotificacion(`Importe inválido para contrato ${d.numeroContrato || "N/A"}. Debe ser un número positivo.`, "error");
                return null;
            }
            if (Number.isNaN(porcDesc) || porcDesc < 0 || porcDesc > 100) {
                Utils.mostrarNotificacion(`Porcentaje de descuento inválido para contrato ${d.numeroContrato || "N/A"}. Debe ser entre 0 y 100.`, "error");
                return null;
            }

            const limProd = DataService.obtenerLimiteDescuento(d.tipoProducto);
            if (porcDesc > limProd) {
                Utils.mostrarNotificacion(`Descuento para ${d.tipoProducto} (${d.numeroContrato || "N/A"}) excede el límite de ${limProd}%.`, "error");
                return null;
            }

            sumaOrigTotal += impOrig;
            const impConDesc = calcularImporteConDescuento(impOrig, porcDesc);
            sumaDescTotal += impConDesc;
            deudasDet.push({
                entidad: d.entidad,
                tipoProducto: d.tipoProducto,
                numeroContrato: d.numeroContrato,
                importeOriginal: impOrig, // Store the number
                porcentajeDescuento: porcDesc, // Store the number
                importeConDescuento: impConDesc
            });
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
            nombreDeudor: nombreDeudor.trim(),
            sumaOriginalTotal: sumaOrigTotal,
            sumaDescontadaTotal: sumaDescTotal,
            ahorro: ahorro,
            comisionExitoBase: comisionExitoBase,
            comisionExitoConIVA: comisionExitoConIVA,
            extra10Base: extra10Base,
            extra10ConIVA: extra10ConIVA,
            totalAPagarFinal: totalAPagarFinal,
            numCuotas: numCuotasParsed,
            cuotaMensual: totalAPagarFinal / numCuotasParsed,
            deudasDetalladas: deudasDet,
            porcentajeDescuentoPromedio: sumaOrigTotal > 0 ? (ahorro / sumaOrigTotal) * 100 : 0,
            fechaCreacion: Utils.obtenerFechaActualFormateada(),
            folio: folioExistente || Utils.generarFolioUnico()
        };

        EventManager.publish("calculoCompletado", resultado);
        return resultado;
    }

    return { calcularTotalesPlan, calcularImporteConDescuento };
})();
