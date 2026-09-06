
(function () {
  'use strict';

  /**
   * Clase encargada de gestionar el ciclo de vida del cliente de Supabase.
   */
  class SupabaseService {
    constructor() {
      // Credenciales de conexión al proyecto
      this.SUPABASE_URL = 'https://jqxqdjxaypcimhftwiuh.supabase.co';
      this.SUPABASE_ANON_KEY = 'sb_publishable_UygjRK05r9CZRA7TdT8P7A_HjbeCdm6';
      
      this.client = null;
      this.initializeService();
    }

    /**
     * Valida la presencia del SDK expuesto por el CDN e instancía el cliente.
     */
    initializeService() {
      try {
        // 1. Verificamos que la librería global cargada desde el CDN exista
        if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
          throw new Error('El SDK CDN de Supabase no está cargado en el HTML. Verifique la etiqueta <script src="...">.');
        }

        // 2. Creamos el cliente de Supabase
        this.client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
        
        console.log(
          '%c[TurnoSalud Engine] Conexión establecida correctamente con el servidor.',
          'color: #008080; font-weight: bold; font-size: 12px;'
        );
      } catch (error) {
        console.error('[SupabaseService Error Critical]:', error.message);
      }
    }

    /**
     * Retorna la instancia activa del cliente de Supabase.
     * Si por algún motivo se perdió, intenta re-inicializarla.
     */
    getClient() {
      if (!this.client) {
        this.initializeService();
      }
      return this.client;
    }
  }

  // Inicializamos la clase singleton del motor
  const systemEngine = new SupabaseService();

  // Obtenemos la instancia del cliente
  const clientInstance = systemEngine.getClient();

  // Asignamos las variables globales requeridas por el resto de tus scripts
  window.db = clientInstance;
  window.supabase = clientInstance;

})();

/* ============================================================================
 * FUNCIONES GLOBALES DE Interfaz de Usuario (UI) y MODALES
 * ============================================================================ */

/**
 * Muestra el modal de ayuda con la guía paso a paso para la reserva de turnos.
 */
window.mostrarAyudaReserva = function () {
  try {
    const modal = document.getElementById('modalAyuda');
    if (modal) {
      modal.style.display = 'flex';
      // Enfocar el modal por accesibilidad si es necesario
      modal.setAttribute('aria-hidden', 'false');
    } else {
      console.warn('[UI Warning]: El contenedor #modalAyuda no fue encontrado en el DOM de la página actual.');
    }
  } catch (err) {
    console.error('[UI Error en mostrarAyudaReserva]:', err);
  }
};

/**
 * Oculta la ventana modal de ayuda para agendar turnos.
 */
window.cerrarAyudaReserva = function () {
  try {
    const modal = document.getElementById('modalAyuda');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  } catch (err) {
    console.error('[UI Error en cerrarAyudaReserva]:', err);
  }
};

/**
 * Event Listener global: Cierra el modal de ayuda automáticamente 
 * si el usuario hace clic fuera del contenido del cuadro de diálogo.
 */
document.addEventListener('DOMContentLoaded', function () {
  const modal = document.getElementById('modalAyuda');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        window.cerrarAyudaReserva();
      }
    });
  }
});