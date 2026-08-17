/**
 * ============================================================================
 * TURNOSALUD - LANDING & SESSION MANAGER (Inicio.js)
 * Sistema Anónimo de Identificación Única de Dispositivo
 * ============================================================================
 */

class PortalInicioController {
  constructor() {
    this.STORAGE_KEY = 'usuario_anonimo_id';
    this.btnReservar = document.getElementById('btnReservar');
    this.init();
  }

  init() {
    if (this.btnReservar) {
      this.btnReservar.addEventListener('click', (e) => this.handleReservaSession(e));
    }
  }

  generateUUIDv4() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'usr_anon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  async handleReservaSession(e) {
    e.preventDefault();
    let anonId = localStorage.getItem(this.STORAGE_KEY);

    if (!anonId) {
      anonId = this.generateUUIDv4();
      try {
        const { error } = await supabase
          .from('usuarios_anonimos')
          .insert([{ id: anonId, creado_el: new Date().toISOString() }]);

        if (error) {
          console.warn('[InicioController] Error al persistir anonimato:', error.message);
        } else {
          localStorage.setItem(this.STORAGE_KEY, anonId);
          console.log('[InicioController] Dispositivo enrolado exitosamente:', anonId);
        }
      } catch (err) {
        console.error('[InicioController Exception]:', err);
      }
    }

    window.location.href = 'ListaMedicos.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PortalInicioController();
});