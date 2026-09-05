/**
 * ============================================================================
 * TURNOSALUD - INICIO CONTROLLER (js/Inicio.js)
 * Controlador del Portal de Entrada y Registro Anónimo de Dispositivo
 * ============================================================================
 */

class WelcomePortalController {
  constructor() {
    this.STORAGE_KEY = 'usuario_anonimo_id';
    this.btnSolicitar = document.getElementById('btnSolicitarTurno');
    this.init();
  }

  init() {
    if (this.btnSolicitar) {
      this.btnSolicitar.addEventListener('click', (event) => this.procesarAcceso(event));
    }
  }

  generarIdentificador() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'usr_anon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  async procesarAcceso(event) {
    event.preventDefault();
    const rutaSiguiente = this.btnSolicitar.getAttribute('href');
    let anonId = localStorage.getItem(this.STORAGE_KEY);

    if (!anonId) {
      anonId = this.generarIdentificador();
      try {
        const { error } = await supabase
          .from('usuarios_anonimos')
          .insert([{ id: anonId, creado_el: new Date().toISOString() }]);

        if (error) {
          console.warn('[WelcomePortal] Registro en servidor pospuesto:', error.message);
        } else {
          console.log('[WelcomePortal] Dispositivo enrolado exitosamente:', anonId);
        }
      } catch (err) {
        console.error('[WelcomePortal Exception]:', err);
      } finally {
        localStorage.setItem(this.STORAGE_KEY, anonId);
      }
    }

    window.location.href = rutaSiguiente;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WelcomePortalController();
});