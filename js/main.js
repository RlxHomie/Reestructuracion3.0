// utils.js (módulo de utilidades)
//////////////////////////////////////////

// Función de debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Notificaciones mejoradas
function mostrarNotificacion(mensaje, tipo = "info", duracion = 4000) {
  const notificacionesAnteriores = document.querySelectorAll(".notificacion");
  notificacionesAnteriores.forEach(notif => {
    notif.classList.add("fadeOut");
    setTimeout(() => notif.remove(), 500);
  });

  const notif = document.createElement("div");
  notif.className = `notificacion ${tipo}`;
  notif.textContent = mensaje;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.transform = "translateY(0)";
    notif.style.opacity = "1";
  }, 10); // Pequeño delay para asegurar la transición de entrada

  setTimeout(() => {
    notif.classList.add("fadeOut");
    setTimeout(() => notif.remove(), 500); // Tiempo para la animación de salida
  }, duracion);
}

// Confirmar acciones críticas
function confirmarAccion(mensaje, accionSi, accionNo = null) {
  if (confirm(mensaje)) {
    accionSi();
  } else if (accionNo) {
    accionNo();
  }
}

// Validación robusta de inputs numéricos
function validarInputNumerico(input, min = 0, max = Infinity, customMessage = null, allowEmpty = false) {
  const valorStr = input.value.trim();
  if (allowEmpty && valorStr === "") {
    input.classList.remove("error");
    return true; // Permitir vacío si está configurado
  }
  const valor = parseFloat(valorStr);
  if (isNaN(valor) || valor < min || valor > max) {
    input.classList.add("error");
    const message = customMessage || `Valor inválido. Debe estar entre ${min} y ${max}.`;
    mostrarNotificacion(message, "error");
    setTimeout(() => input.classList.remove("error"), 1500);
    return false;
  }
  input.classList.remove("error");
  return true;
}

// Función para formatear números como moneda
function formatoMoneda(numero) {
  if (isNaN(parseFloat(numero))) return "€0.00"; // Devolver un valor por defecto si no es un número
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
}

// Función para mostrar/ocultar el indicador de carga
function toggleCargando(mostrar, mensaje = "Procesando...") {
  const indicador = document.getElementById("indicadorCarga");
  const mensajeCarga = document.getElementById("mensajeCarga");
  
  if (indicador && mensajeCarga) {
    if (mostrar) {
        mensajeCarga.textContent = mensaje;
        indicador.style.display = "flex";
    } else {
        indicador.style.display = "none";
    }
  } else {
    console.warn("Elementos de carga no encontrados en el DOM.");
  }
}

//////////////////////////////////////////
// DataModule (Gestión de datos locales)
//////////////////////////////////////////
const DataModule = (function() {
  const LOCAL_ENTIDADES_PATH = "data_entidades/entidades.json";
  const LOCAL_TIPOS_PRODUCTO_PATH = "data_tipos_producto/tipos_producto.json";
  const LOCAL_CONTRATOS_DIR = "contratos_guardados/"; 

  let entidades = [];
  let tiposProducto = [];
  let datosCargados = false;
  let historialContratosEnMemoria = [];

  const limitesDescuento = {
    "Microcrédito": 50,
    "Tarjeta de Crédito": 20,
    "Préstamo Personal": 15,
    "Hipoteca": 15,
    "Línea de Crédito": 15,
    "Crédito al Consumo": 15,
    "Préstamo Rápido": 15,
    "Financiación de Vehículo": 15
  };

  async function cargarCatalogosLocales() {
    toggleCargando(true, "Cargando catálogos locales...");
    try {
      const fetchEntidades = fetch(LOCAL_ENTIDADES_PATH)
        .then(response => {
          if (!response.ok) throw new Error(`Entidades: ${response.statusText} (${LOCAL_ENTIDADES_PATH})`);
          return response.json();
        })
        .catch(err => {
            console.error("Error específico al cargar entidades:", err);
            mostrarNotificacion(`Error al cargar entidades: ${err.message}. Se usarán valores por defecto.`, "error", 6000);
            return ["Error al cargar entidades"]; // Valor por defecto en caso de error
        });

      const fetchTiposProducto = fetch(LOCAL_TIPOS_PRODUCTO_PATH)
        .then(response => {
          if (!response.ok) throw new Error(`Tipos Producto: ${response.statusText} (${LOCAL_TIPOS_PRODUCTO_PATH})`);
          return response.json();
        })
        .catch(err => {
            console.error("Error específico al cargar tipos de producto:", err);
            mostrarNotificacion(`Error al cargar tipos de producto: ${err.message}. Se usarán valores por defecto.`, "error", 6000);
            return ["Error al cargar tipos"]; // Valor por defecto
        });

      [entidades, tiposProducto] = await Promise.all([fetchEntidades, fetchTiposProducto]);
      
      // Verificar si la carga fue exitosa (no son los arrays de error)
      if (entidades.length > 0 && entidades[0] !== "Error al cargar entidades" && 
          tiposProducto.length > 0 && tiposProducto[0] !== "Error al cargar tipos") {
        datosCargados = true;
        mostrarNotificacion("Catálogos locales cargados correctamente.", "success");
      } else {
        datosCargados = false;
        // Las notificaciones de error ya se mostraron en los catch individuales
      }

    } catch (error) { // Error general de Promise.all si algo más falla
      console.error("Error general al cargar catálogos locales:", error);
      mostrarNotificacion(`Error general al cargar catálogos: ${error.message}.`, "error", 6000);
      entidades = ["Error al cargar entidades"];
      tiposProducto = ["Error al cargar tipos"];
      datosCargados = false;
    }
    toggleCargando(false);
    return { entidades, tiposProducto };
  }

  function obtenerLimiteDescuento(tipoProducto) {
    return limitesDescuento[tipoProducto] !== undefined ? limitesDescuento[tipoProducto] : 100;
  }
  
  function setHistorialEnMemoria(contratos) {
    historialContratosEnMemoria = contratos;
  }

  function getHistorialEnMemoria() {
    return historialContratosEnMemoria;
  }

  function getContratoDelHistorialEnMemoria(folio) {
    return historialContratosEnMemoria.find(c => c.folio === folio);
  }

  function agregarContratoAlHistorialEnMemoria(contrato) {
    const existenteIndex = historialContratosEnMemoria.findIndex(c => c.folio === contrato.folio);
    if (existenteIndex !== -1) {
      historialContratosEnMemoria[existenteIndex] = contrato;
    } else {
      historialContratosEnMemoria.push(contrato);
    }
  }

  return {
    cargarCatalogosLocales,
    getEntidades: () => entidades,
    getTiposProducto: () => tiposProducto,
    isDatosCargados: () => datosCargados,
    obtenerLimiteDescuento,
    setHistorialEnMemoria,
    getHistorialEnMemoria,
    getContratoDelHistorialEnMemoria,
    agregarContratoAlHistorialEnMemoria,
    LOCAL_CONTRATOS_DIR
  };
})();

//////////////////////////////////////////
// SimuladorModule
//////////////////////////////////////////
const SimuladorModule = (function() {
  const btnAgregarFila = document.getElementById("btnAgregarFila");
  const btnCalcular = document.getElementById("btnCalcular");
  const btnReAnalizar = document.getElementById("btnReAnalizar");
  const tablaDeudasBody = document.getElementById("tablaDeudas"); // Es el tbody
  const nombreDeudorInput = document.getElementById("nombreDeudor");
  const numCuotasInput = document.getElementById("numCuotas");
  const resultadoFinalCard = document.getElementById("resultadoFinal");
  const planContainerOuter = document.getElementById("planContainerOuter");
  const btnEditarContrato = document.getElementById("btnEditarContrato");
  
  let contadorFilasGlobal = 0;
  let resultadoCalculado = null;
  let folioEditando = null;
  let chartInstance = null;

  function inicializar() {
    // Event listeners para botones principales
    btnAgregarFila.addEventListener("click", () => { aplicarEfectoClick(btnAgregarFila); agregarFila(); });
    btnCalcular.addEventListener("click", () => { aplicarEfectoClick(btnCalcular); calcularTotales(); });
    btnReAnalizar.addEventListener("click", () => { aplicarEfectoClick(btnReAnalizar); reAnalizar(); });
    
    document.getElementById("btnExportarJSON").addEventListener("click", function() {
        aplicarEfectoClick(this);
        exportarContratoJSON();
    });

    document.getElementById("btnDescargarPlan").addEventListener("click", function() {
      aplicarEfectoClick(this);
      if (!resultadoCalculado) {
          mostrarNotificacion("Primero calcula un plan para poder descargarlo.", "warning");
          return;
      }
      if (!validarRestriccion94(false)) return; // No mostrar notificación de restricción aquí, ya se hizo en calcular
      generarPDF();
    });

    document.getElementById("btnContratar").addEventListener("click", function() {
      aplicarEfectoClick(this);
      if (!resultadoCalculado) {
          mostrarNotificacion("Primero calcula un plan para poder contratarlo.", "warning");
          return;
      }
      if (!validarRestriccion94(false)) return; // Idem
      confirmarAccion(folioEditando ? "¿Confirmas la actualización de este contrato? El archivo original deberá ser reemplazado manualmente." : "¿Estás seguro de que quieres contratar este plan? Se generará un archivo JSON para guardar.", () => {
          contratarPlanLocal();
      });
    });

    btnEditarContrato.addEventListener("click", function() {
        aplicarEfectoClick(this);
        if (folioEditando) {
            const contrato = DataModule.getContratoDelHistorialEnMemoria(folioEditando);
            if (contrato) {
                cargarDatosParaEdicion(contrato);
                document.getElementById("historialContainer").style.display = "none";
                mostrarNotificacion("Datos cargados para edición. Realiza los cambios y vuelve a calcular.", "info");
            } else {
                mostrarNotificacion("Error: No se encontró el contrato para editar.", "error");
            }
        }
    });

    // Historial
    const btnMostrarHistorial = document.getElementById("btnMostrarHistorial");
    btnMostrarHistorial.addEventListener("click", () => { aplicarEfectoClick(btnMostrarHistorial); cargarHistorialDesdeArchivos(); });
    const btnCerrarHistorial = document.getElementById("btnCerrarHistorial");
    btnCerrarHistorial.addEventListener("click", () => { document.getElementById("historialContainer").style.display = "none"; });
    window.addEventListener("click", (event) => {
      if (event.target == document.getElementById("historialContainer")) {
        document.getElementById("historialContainer").style.display = "none";
      }
    });

    agregarFila(); // Agregar una fila inicial
    
    DataModule.cargarCatalogosLocales()
      .then(() => {
        actualizarSelectoresEnFilasExistentes();
      })
      .catch(error => {
        console.error("Error al inicializar catálogos:", error);
        actualizarSelectoresEnFilasExistentes(); 
      });
  }

  function aplicarEfectoClick(boton) {
      boton.classList.add("clicked");
      setTimeout(() => boton.classList.remove("clicked"), 200);
  }
  
  function actualizarSelectoresEnFilasExistentes() {
    const filas = tablaDeudasBody.querySelectorAll("tr");
    filas.forEach(fila => {
      const selectorTipoProducto = fila.querySelector(".selector-tipo-producto");
      const selectorEntidad = fila.querySelector(".selector-entidad");
      
      if (selectorTipoProducto) actualizarSelector(selectorTipoProducto, DataModule.getTiposProducto(), selectorTipoProducto.value);
      if (selectorEntidad) actualizarSelector(selectorEntidad, DataModule.getEntidades(), selectorEntidad.value);
    });
  }
  
  function actualizarSelector(selector, opciones, valorActual = null) {
    selector.innerHTML = ""; // Limpiar opciones existentes
    const opcionDefecto = document.createElement("option");
    opcionDefecto.value = "";
    opcionDefecto.textContent = "Seleccionar...";
    selector.appendChild(opcionDefecto);
    
    (opciones || []).forEach(opcion => {
      const nuevaOpcion = document.createElement("option");
      nuevaOpcion.value = opcion;
      nuevaOpcion.textContent = opcion;
      selector.appendChild(nuevaOpcion);
    });
    if (valorActual) selector.value = valorActual; // Restaurar valor si se pasó
  }

  function agregarFila(datosFila = {}) {
    contadorFilasGlobal++;
    const nuevaFila = tablaDeudasBody.insertRow(); // Insertar en tbody
    nuevaFila.id = `fila-${contadorFilasGlobal}`;
    nuevaFila.classList.add("fade-in");

    const celdasInfo = [
        { placeholder: "Número de Contrato", tipo: "text", clase: "input-contrato", valor: datosFila.numeroContrato || "" },
        { tipo: "select", clase: "selector-tipo-producto", opciones: DataModule.getTiposProducto(), valor: datosFila.tipoProducto || "" },
        { tipo: "select", clase: "selector-entidad", opciones: DataModule.getEntidades(), valor: datosFila.entidad || "" },
        { placeholder: "0.00", tipo: "number", clase: "input-importe", valor: datosFila.importeDeuda || "", step: "0.01", min: "0.01" },
        { placeholder: "0", tipo: "number", clase: "input-descuento", valor: datosFila.porcentajeDescuento || "0", min: "0", max: "100" },
        { tipo: "text", clase: "input-importe-descuento", valor: datosFila.importeConDescuento ? formatoMoneda(datosFila.importeConDescuento) : formatoMoneda(0), readonly: true },
    ];

    celdasInfo.forEach(info => {
        const celda = nuevaFila.insertCell();
        if (info.tipo === "select") {
            const select = document.createElement("select");
            select.className = info.clase;
            actualizarSelector(select, info.opciones, info.valor);
            if (info.clase === "selector-tipo-producto") {
                select.addEventListener("change", () => validarDescuentoParaFila(nuevaFila));
            }
            celda.appendChild(select);
        } else {
            const input = document.createElement("input");
            input.type = info.tipo;
            input.placeholder = info.placeholder;
            input.className = info.clase;
            input.value = info.valor;
            if (info.readonly) input.readOnly = true;
            if (info.step) input.step = info.step;
            if (info.min) input.min = info.min;
            // Max para descuento se actualiza dinámicamente
            if (info.clase === "input-descuento") {
                input.addEventListener("input", debounce(() => validarDescuentoParaFila(nuevaFila), 300));
            }
            if (info.clase === "input-importe" || info.clase === "input-descuento") {
                input.addEventListener("input", debounce(calcularImporteConDescuentoFila, 300));
            }
            celda.appendChild(input);
        }
    });

    const celdaAccion = nuevaFila.insertCell();
    const btnEliminar = document.createElement("button");
    btnEliminar.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>`;
    btnEliminar.className = "btn-eliminar";
    btnEliminar.title = "Eliminar deuda";
    btnEliminar.onclick = () => eliminarFila(nuevaFila.id);
    celdaAccion.appendChild(btnEliminar);

    // Si los catálogos ya están cargados, popular los selectores de la nueva fila
    if (DataModule.isDatosCargados()) {
        actualizarSelector(nuevaFila.querySelector(".selector-tipo-producto"), DataModule.getTiposProducto(), datosFila.tipoProducto || "");
        actualizarSelector(nuevaFila.querySelector(".selector-entidad"), DataModule.getEntidades(), datosFila.entidad || "");
    }
    validarDescuentoParaFila(nuevaFila); // Validar al agregar
    calcularImporteConDescuentoFila({ target: nuevaFila.querySelector(".input-importe") }); // Calcular descuento inicial
    if (resultadoCalculado) calcularTotales(); 
  }

  function calcularImporteConDescuentoFila(event) {
    const inputElement = event.target;
    const fila = inputElement.closest("tr");
    if (!fila) return;

    const importeDeudaInput = fila.querySelector(".input-importe");
    const descuentoInput = fila.querySelector(".input-descuento");
    const importeConDescuentoInput = fila.querySelector(".input-importe-descuento");

    const importeDeuda = parseFloat(importeDeudaInput.value) || 0;
    const porcentajeDescuento = parseFloat(descuentoInput.value) || 0;

    if (importeDeuda < 0) importeDeudaInput.value = "0.00"; // No permitir negativos
    if (porcentajeDescuento < 0) descuentoInput.value = "0";
    if (porcentajeDescuento > 100) descuentoInput.value = "100"; // Aunque se valida con limite, un cap general

    const importeConDescuento = importeDeuda * (1 - porcentajeDescuento / 100);
    importeConDescuentoInput.value = formatoMoneda(importeConDescuento);
  }

  function validarDescuentoParaFila(fila) {
    const tipoProductoSelect = fila.querySelector(".selector-tipo-producto");
    const descuentoInput = fila.querySelector(".input-descuento");
    if (!tipoProductoSelect || !descuentoInput) return true;

    const tipoProducto = tipoProductoSelect.value;
    const limite = tipoProducto ? DataModule.obtenerLimiteDescuento(tipoProducto) : 100;
    
    descuentoInput.max = limite;
    const esValido = validarInputNumerico(descuentoInput, 0, limite, `El descuento para ${tipoProducto || 'este producto'} no puede exceder ${limite}%.`);
    calcularImporteConDescuentoFila({ target: descuentoInput }); // Recalcular con el valor validado (o no)
    return esValido;
  }

  function eliminarFila(idFila) {
    confirmarAccion("¿Seguro que quieres eliminar esta deuda?", () => {
      const fila = document.getElementById(idFila);
      if (fila) {
        fila.classList.add("fade-out");
        setTimeout(() => {
            fila.remove();
            mostrarNotificacion("Deuda eliminada", "info");
            if (tablaDeudasBody.rows.length === 0) agregarFila(); // Asegurar que siempre haya una fila si se borran todas
            if (resultadoCalculado) calcularTotales(); // Recalcular si había un resultado previo
        }, 300);
      }
    });
  }

  function validarFormularioCliente() {
    if (!nombreDeudorInput.value.trim()) {
        mostrarNotificacion("Por favor, ingresa el nombre del cliente.", "error");
        nombreDeudorInput.focus();
        return false;
    }
    if (!validarInputNumerico(numCuotasInput, 1, 120, "El número de cuotas debe estar entre 1 y 120.")) {
        numCuotasInput.focus();
        return false;
    }
    return true;
  }

  function calcularTotales() {
    if (!validarFormularioCliente()) return;

    let totalDeudaOriginalGlobal = 0;
    let totalDeudaConDescuentoGlobal = 0;
    const detallesDeudasArray = [];

    const filas = tablaDeudasBody.rows;
    if (filas.length === 0) {
        mostrarNotificacion("No hay deudas para calcular. Agrega al menos una.", "warning");
        return;
    }

    let datosValidosEnFilas = true;
    for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const numeroContratoInput = fila.cells[0].querySelector("input");
        const tipoProductoSelect = fila.cells[1].querySelector("select");
        const entidadSelect = fila.cells[2].querySelector("select");
        const importeDeudaInput = fila.cells[3].querySelector("input");
        const descuentoInput = fila.cells[4].querySelector("input");
        const importeConDescuentoInput = fila.cells[5].querySelector("input"); // Solo lectura

        // Validaciones de campos obligatorios en la fila
        if (!numeroContratoInput.value.trim()) { mostrarNotificacion(`Fila ${i+1}: Ingresa el número de contrato.`, "error"); datosValidosEnFilas = false; numeroContratoInput.focus(); break; }
        if (!tipoProductoSelect.value) { mostrarNotificacion(`Fila ${i+1}: Selecciona el tipo de producto.`, "error"); datosValidosEnFilas = false; tipoProductoSelect.focus(); break; }
        if (!entidadSelect.value) { mostrarNotificacion(`Fila ${i+1}: Selecciona la entidad.`, "error"); datosValidosEnFilas = false; entidadSelect.focus(); break; }
        if (!validarInputNumerico(importeDeudaInput, 0.01, Infinity, `Fila ${i+1}: Importe de deuda inválido.`)) { datosValidosEnFilas = false; importeDeudaInput.focus(); break; }
        if (!validarDescuentoParaFila(fila)) { datosValidosEnFilas = false; descuentoInput.focus(); break; } // Esta ya muestra su propia notificación

        const importeDeuda = parseFloat(importeDeudaInput.value);
        const porcentajeDescuento = parseFloat(descuentoInput.value);
        const importeConDescuento = importeDeuda * (1 - porcentajeDescuento / 100);

        totalDeudaOriginalGlobal += importeDeuda;
        totalDeudaConDescuentoGlobal += importeConDescuento;
        detallesDeudasArray.push({
            numeroContrato: numeroContratoInput.value.trim(),
            tipoProducto: tipoProductoSelect.value,
            entidad: entidadSelect.value,
            importeDeuda: importeDeuda,
            porcentajeDescuento: porcentajeDescuento,
            importeConDescuento: importeConDescuento
        });
    }

    if (!datosValidosEnFilas) {
        resultadoCalculado = null; // Invalidar resultado anterior si los datos no son válidos
        ocultarPlanLiquidacion();
        return;
    }

    const nCuotas = parseInt(numCuotasInput.value);
    const ahorro = totalDeudaOriginalGlobal - totalDeudaConDescuentoGlobal;
    const comisionExito = 0.20 * ahorro + 0.21 * (0.20 * ahorro); // 20% del ahorro + IVA sobre esa comisión
    const extra10 = 0.10 * totalDeudaOriginalGlobal + 0.21 * (0.10 * totalDeudaOriginalGlobal); // 10% de la deuda original + IVA
    const totalAPagarFinal = totalDeudaConDescuentoGlobal + comisionExito + extra10;
    const cuotaMensual = totalAPagarFinal / nCuotas;

    resultadoCalculado = {
        nombreDeudor: nombreDeudorInput.value.trim(),
        numCuotas: nCuotas,
        totalDeudaOriginal: totalDeudaOriginalGlobal,
        totalDeudaConDescuento: totalDeudaConDescuentoGlobal,
        ahorro: ahorro,
        comisionExito: comisionExito,
        extra10: extra10,
        totalAPagarFinal: totalAPagarFinal,
        cuotaMensual: cuotaMensual,
        detallesDeudas: detallesDeudasArray,
        folio: folioEditando || `DMD-${Date.now()}`,
        fechaCreacion: new Date().toLocaleDateString("es-ES")
    };
    
    // Validar restricción del 94% ANTES de mostrar el plan
    if (!validarRestriccion94(true)) { // true para mostrar notificación si falla
        ocultarPlanLiquidacion(); // Asegurarse de que el plan no se muestre si la restricción falla
        return; 
    }

    mostrarPlanLiquidacion(resultadoCalculado);
    folioEditando = null; // Limpiar folio en edición después de un cálculo exitoso
    btnEditarContrato.style.display = "none";
  }

  function validarRestriccion94(mostrarNotifSiFalla = true) {
    if (!resultadoCalculado) return true; // Si no hay cálculo, no hay nada que restringir

    const limitePago = resultadoCalculado.totalDeudaOriginal * 0.94;
    if (resultadoCalculado.totalAPagarFinal > limitePago) {
      if (mostrarNotifSiFalla) {
        mostrarNotificacion(
            `Restricción: El total a pagar (${formatoMoneda(resultadoCalculado.totalAPagarFinal)}) excede el 94% de la deuda original (${formatoMoneda(limitePago)}). No se puede contratar ni generar PDF. Ajusta los descuentos o deudas.`, 
            "error", 
            8000 // Duración más larga para este mensaje importante
        );
      }
      return false;
    }
    return true;
  }

  function mostrarPlanLiquidacion(datos) {
    document.getElementById("plan-nombre-deudor").textContent = datos.nombreDeudor;
    document.getElementById("plan-num-deudas").textContent = datos.detallesDeudas.length;
    document.getElementById("plan-deuda-total").textContent = formatoMoneda(datos.totalDeudaOriginal);
    document.getElementById("plan-folio").textContent = datos.folio;
    document.getElementById("plan-fecha").textContent = datos.fechaCreacion;

    document.getElementById("plan-lo-que-debes").textContent = formatoMoneda(datos.totalDeudaOriginal);
    document.getElementById("plan-lo-que-pagarias").textContent = formatoMoneda(datos.totalAPagarFinal);
    document.getElementById("plan-ahorro").textContent = formatoMoneda(datos.ahorro);

    document.getElementById("plan-duracion").textContent = `${datos.numCuotas} meses`;
    document.getElementById("plan-cuota-mensual").textContent = formatoMoneda(datos.cuotaMensual);
    const descuentoTotalPorcentaje = datos.totalDeudaOriginal > 0 ? (datos.ahorro / datos.totalDeudaOriginal * 100) : 0;
    document.getElementById("plan-descuento-total").textContent = `${descuentoTotalPorcentaje.toFixed(2)}%`;

    const planTablaBody = document.getElementById("plan-tabla-body");
    planTablaBody.innerHTML = "";
    datos.detallesDeudas.forEach(deuda => {
        const fila = planTablaBody.insertRow();
        fila.insertCell().textContent = deuda.entidad;
        fila.insertCell().textContent = formatoMoneda(deuda.importeDeuda);
        fila.insertCell().textContent = formatoMoneda(deuda.importeConDescuento);
    });

    // Gráfico
    const ctx = document.getElementById('myChart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Lo que pagarías', 'Te ahorras'],
            datasets: [{
                data: [datos.totalAPagarFinal, datos.ahorro],
                backgroundColor: ['#0071e3', '#34c759'],
                borderColor: ['#FFFFFF', '#FFFFFF'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatoMoneda(context.raw)}`;
                        }
                    }
                }
            }
        }
    });

    planContainerOuter.style.display = "block";
    planContainerOuter.scrollIntoView({ behavior: "smooth" });
  }

  function ocultarPlanLiquidacion() {
    planContainerOuter.style.display = "none";
    resultadoCalculado = null; // Asegurarse de que no haya un resultado válido si se oculta
  }

  function reAnalizar() {
    confirmarAccion("¿Seguro que quieres reiniciar el simulador? Se perderán los datos no guardados.", () => {
        nombreDeudorInput.value = "";
        numCuotasInput.value = "12";
        tablaDeudasBody.innerHTML = "";
        contadorFilasGlobal = 0;
        agregarFila(); // Agrega una fila limpia inicial
        ocultarPlanLiquidacion();
        resultadoCalculado = null;
        folioEditando = null;
        btnEditarContrato.style.display = "none";
        nombreDeudorInput.focus();
        mostrarNotificacion("Simulador reiniciado.", "info");
    });
  }

  function generarPDF() {
    toggleCargando(true, "Generando PDF...");
    const elementoParaPDF = document.getElementById("plan-de-liquidacion");
    elementoParaPDF.classList.add("pdf-export"); // Aplicar clase para estilos PDF

    const nombreArchivo = `${resultadoCalculado.nombreDeudor || 'Cliente'}_${resultadoCalculado.fechaCreacion.replace(/\//g, '-')}_${resultadoCalculado.folio}.pdf`;

    html2pdf().set({
        margin: [10, 10, 10, 10], // Margen en mm [top, left, bottom, right]
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, // Mayor escala para mejor calidad
            logging: false, 
            useCORS: true, // Si hay imágenes externas
            scrollY: -window.scrollY // Para capturar desde el inicio
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(elementoParaPDF).save().then(() => {
        elementoParaPDF.classList.remove("pdf-export");
        toggleCargando(false);
        mostrarNotificacion("PDF generado y descargado: " + nombreArchivo, "success");
    }).catch(err => {
        elementoParaPDF.classList.remove("pdf-export");
        toggleCargando(false);
        mostrarNotificacion("Error al generar PDF: " + err.message, "error");
        console.error("Error PDF:", err);
    });
  }

  function exportarContratoJSON() {
    if (!resultadoCalculado) {
        mostrarNotificacion("No hay datos calculados para exportar.", "warning");
        return;
    }
    // No es necesario validar la restricción del 94% para exportar el JSON, solo para contratar/PDF.

    const nombreArchivo = `${resultadoCalculado.nombreDeudor || 'Cliente'}_${resultadoCalculado.fechaCreacion.replace(/\//g, '-')}_${resultadoCalculado.folio}.json`;
    const datosJSON = JSON.stringify(resultadoCalculado, null, 2);
    const blob = new Blob([datosJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarNotificacion(`Contrato exportado como ${nombreArchivo}. Guárdalo en la carpeta '${DataModule.LOCAL_CONTRATOS_DIR}' si deseas cargarlo en el historial.`, "success", 6000);
  }
  
  function contratarPlanLocal() {
    // La función exportarContratoJSON ya hace la descarga del JSON.
    // Esta función ahora solo sirve como wrapper para la confirmación y el mensaje.
    exportarContratoJSON(); 
    // Aquí se podría añadir lógica adicional si 
