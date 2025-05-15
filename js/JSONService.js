import { Utils } from "./Utils.js";

export const JSONService = (() => {
    function descargarJSON(data, nombreArchivo) {
        if (!data) { Utils.mostrarNotificacion("No hay datos para exportar.", "error"); return; }
        Utils.toggleCargando(true, "Exportando JSON...");
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = nombreArchivo;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Utils.mostrarNotificacion(`Archivo ${nombreArchivo} descargado.`, "success");
        } catch (error) {
            console.error("Error al generar JSON:", error);
            Utils.mostrarNotificacion("Error al generar el archivo JSON.", "error");
        }
        Utils.toggleCargando(false);
    }
    async function generarYDescargarPDF(datos) {
        if (!datos) { Utils.mostrarNotificacion("No hay datos para generar el PDF.", "error"); return; }
        Utils.toggleCargando(true, "Generando PDF...");
        try {
            const { jsPDF } = window.jspdf; // Assumes jspdf is loaded globally
            const pdf = new jsPDF("p", "pt", "a4");
            const margin = 40, lineHeight = 18, cellPadding = 5;
            let y = margin;

            pdf.setFontSize(18); pdf.setFont("helvetica", "bold");
            pdf.text("Plan de Reestructuración de Deuda", pdf.internal.pageSize.getWidth() / 2, y, { align: "center" });
            y += lineHeight * 2;

            pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
            pdf.text(`Cliente: ${datos.nombreDeudor}`, margin, y); y += lineHeight;
            pdf.text(`Folio: ${datos.folio}`, margin, y); y += lineHeight;
            pdf.text(`Fecha: ${datos.fechaCreacion}`, margin, y); y += lineHeight * 1.5;

            pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
            pdf.text("Resumen del Plan:", margin, y); y += lineHeight * 1.5;
            pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
            const resumenData = [
                ["Deuda Original Total:", Utils.formatoMoneda(datos.sumaOriginalTotal)],
                ["Total a Pagar (con descuento y comisiones):", Utils.formatoMoneda(datos.totalAPagarFinal)],
                ["Ahorro Estimado:", Utils.formatoMoneda(datos.ahorro)],
                ["Duración del Plan:", `${datos.numCuotas} meses`],
                ["Cuota Mensual Estimada:", Utils.formatoMoneda(datos.cuotaMensual)],
                ["Descuento Promedio Aplicado:", `${datos.porcentajeDescuentoPromedio.toFixed(2)}%`]
            ];
            pdf.autoTable({ startY: y, head: [["Concepto", "Valor"]], body: resumenData, theme: "grid", styles: { fontSize: 9, cellPadding: cellPadding } });
            y = pdf.lastAutoTable.finalY + lineHeight * 1.5;

            pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
            pdf.text("Detalle de Deudas Incluidas:", margin, y); y += lineHeight * 1.5;
            const head = [["Nº Contrato", "Tipo Producto", "Entidad", "Deuda Orig.", "% Desc.", "Deuda Final"]];
            const body = datos.deudasDetalladas.map(d => [
                d.numeroContrato || "N/A", d.tipoProducto, d.entidad,
                Utils.formatoMoneda(d.importeOriginal), `${d.porcentajeDescuento}%`,
                Utils.formatoMoneda(d.importeConDescuento)
            ]);
            pdf.autoTable({ startY: y, head: head, body: body, theme: "grid", styles: { fontSize: 8, cellPadding: cellPadding } });
            y = pdf.lastAutoTable.finalY + lineHeight * 2;
            
            pdf.setFontSize(8);
            pdf.text("Este documento es una simulación y no representa un contrato vinculante hasta su formalización.", margin, y);
            y += lineHeight;
            pdf.text("Comisión de éxito (20% s/ahorro + IVA) y Extra (10% s/deuda original + IVA) incluidos en 'Total a Pagar'.", margin, y);

            const nombreArchivo = `${datos.nombreDeudor.replace(/\s+/g, "_")}_${datos.fechaCreacion.replace(/\//g, "-")}_${datos.folio}.pdf`;
            pdf.save(nombreArchivo);
            Utils.mostrarNotificacion(`PDF "${nombreArchivo}" generado.`, "success");
        } catch (error) {
            console.error("Error al generar PDF:", error);
            Utils.mostrarNotificacion("Error al generar el PDF. Verifique que las librerías jsPDF y autoTable estén cargadas.", "error");
        }
        Utils.toggleCargando(false);
    }
    return { descargarJSON, generarYDescargarPDF };
})();
