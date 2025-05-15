import { Config } from "./Config.js";

export const Utils = (() => {
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    function mostrarNotificacion(mensaje, tipo = "info", duracion = Config.NOTIFICATION_DURATION) {
        // Remove any existing notifications immediately to prevent overlap if rapidly fired
        document.querySelectorAll(".notificacion").forEach(n => n.remove());
        
        const notif = document.createElement("div");
        notif.className = `notificacion ${tipo}`;
        notif.textContent = mensaje;
        // Apply a more specific style for positioning if needed, or ensure CSS handles it well
        document.body.appendChild(notif);
        
        // Trigger reflow to ensure transition is applied
        notif.offsetHeight; 

        // Animate in
        notif.style.transform = "translateY(0)";
        notif.style.opacity = "1";

        setTimeout(() => {
            notif.style.transform = "translateY(-20px)"; // Or fadeOut class if preferred
            notif.style.opacity = "0";
            setTimeout(() => notif.remove(), 500); // Remove from DOM after fade out
        }, duracion);
    }
    function confirmarAccion(mensaje, accionSi, accionNo = null) {
        // Consider replacing with a custom, non-blocking modal for better UX later if desired
        if (confirm(mensaje)) { 
            if (typeof accionSi === "function") accionSi(); 
        }
        else { 
            if (typeof accionNo === "function") accionNo(); 
        }
    }
    function validarInputNumerico(input, min = -Infinity, max = Infinity, msg = null, emptyOk = false) {
        if (!input) { 
            console.warn("validarInputNumerico: input element does not exist."); 
            return false; 
        }
        const valStr = input.value.trim();
        if (emptyOk && valStr === "") {
            input.classList.remove("error"); 
            return true; 
        }
        const val = Number(valStr);
        if (Number.isNaN(val) || val < min || val > max) {
            input.classList.add("error");
            mostrarNotificacion(msg || `Valor inválido. Debe ser un número entre ${min} y ${max}.`, "error");
            // input.focus(); // Optionally focus the input
            // setTimeout(() => input.classList.remove("error"), 2500); // Keep error visible a bit longer
            return false;
        }
        input.classList.remove("error"); 
        return true;
    }
    function formatoMoneda(num) {
        const number = Number(num);
        if (Number.isNaN(number)) return "€0.00"; // Or handle as an error, e.g., return "N/A"
        return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
    }
    function toggleCargando(mostrar, mensaje = "Procesando...") {
        const ind = document.getElementById("indicadorCarga");
        const msgEl = document.getElementById("mensajeCarga");
        if (ind && msgEl) { 
            ind.style.display = mostrar ? "flex" : "none";
            if(mostrar) msgEl.textContent = mensaje;
        }
        else { 
            console.warn("Utils.toggleCargando: Elementos de carga 'indicadorCarga' o 'mensajeCarga' no encontrados."); 
        }
    }
    function aplicarEfectoClick(btn) { 
        if (btn && btn.classList) { 
            btn.classList.add("clicked"); 
            setTimeout(() => btn.classList.remove("clicked"), 200); 
        }
    }
    function generarFolioUnico() { 
        return `DMD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`; 
    }
    function obtenerFechaActualFormateada() {
        const h = new Date(), d = String(h.getDate()).padStart(2, "0"), m = String(h.getMonth() + 1).padStart(2, "0");
        return `${d}/${m}/${h.getFullYear()}`;
    }
    return { 
        debounce, 
        mostrarNotificacion, 
        confirmarAccion, 
        validarInputNumerico, 
        formatoMoneda, 
        toggleCargando, 
        aplicarEfectoClick, 
        generarFolioUnico, 
        obtenerFechaActualFormateada 
    };
})();
