export const Config = {
    LOCAL_ENTIDADES_PATH: "data_entidades/entidades.json", // Path relative to index.html
    LOCAL_TIPOS_PRODUCTO_PATH: "data_tipos_producto/tipos_producto.json", // Path relative to index.html
    LOCAL_CONTRATOS_DIR: "contratos_guardados/",
    LIMITES_DESCUENTO: {
        "Microcrédito": 50, "Tarjeta de Crédito": 20, "Préstamo Personal": 15,
        "Hipoteca": 15, "Línea de Crédito": 15, "Crédito al Consumo": 15,
        "Préstamo Rápido": 15, "Financiación de Vehículo": 15
    },
    DEFAULT_ERROR_ENTIDADES: ["…cargando entidades"],
    DEFAULT_ERROR_TIPOS_PRODUCTO: ["…cargando tipos"],
    MAX_CUOTAS: 120, MIN_CUOTAS: 1, DEFAULT_NUM_CUOTAS: 12,
    COMISION_EXITO_PORCENTAJE: 0.20, EXTRA_10_PORCENTAJE_DEUDA_ORIGINAL: 0.10,
    IVA_PORCENTAJE: 0.21, RESTRICCION_PAGO_MAXIMO_PORCENTAJE_DEUDA_ORIGINAL: 0.94,
    DEBOUNCE_TIME: 300, NOTIFICATION_DURATION: 4000,
    CHART_COLORS: { TOTAL_A_PAGAR: "#0071e3", AHORRO_TOTAL: "#34c759" },
    MAX_HISTORIAL_ITEMS_RENDER_DIRECTLY: 100
};
