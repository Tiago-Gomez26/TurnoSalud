/**
 * ============================================================================
 * TURNOSALUD - PANEL DE CONTROL INSTITUCIONAL (ListaDeAdministracion.js)
 * Administración Central de Métricas, Médicos y Parámetros del Sistema
 * ============================================================================
 */

class SystemAdminDashboard {
  constructor() {
    this.lblMetricaTurnos = document.getElementById('totalTurnos');
    this.lblMetricaMedicos = document.getElementById('totalMedicos');
    this.init();
  }

  async init() {
    console.log('%c[TurnoSalud Admin Core] Inicializando métricas de control...', 'color: #008080;');
    await this.obtenerEstadisticas();
  }

  async obtenerEstadisticas() {
    try {
      // Conteo global de reservas
      const { count: countTurnos, error: errTurnos } = await supabase
        .from('turnos')
        .select('*', { count: 'exact', head: true });

      // Conteo de staff médico activo
      const { count: countMedicos, error: errMedicos } = await supabase
        .from('medicos')
        .select('*', { count: 'exact', head: true });

      if (!errTurnos && this.lblMetricaTurnos) {
        this.lblMetricaTurnos.textContent = countTurnos || '0';
      }

      if (!errMedicos && this.lblMetricaMedicos) {
        this.lblMetricaMedicos.textContent = countMedicos || '0';
      }

    } catch (err) {
      console.error('[AdminDashboard Metrics Exception]:', err);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SystemAdminDashboard();
});