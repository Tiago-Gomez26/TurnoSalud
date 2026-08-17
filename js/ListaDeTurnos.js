/**
 * ============================================================================
 * TURNOSALUD - AGENDA PROFESIONAL MÉDICA (ListaDeTurnos.js)
 * Panel Operativo Institucional para Consulta de Turnos Agendados
 * ============================================================================
 */

class AgendaMedicaController {
  constructor() {
    this.tablaCuerpo = document.getElementById('cuerpoTablaTurnos');
    this.init();
  }

  async init() {
    this.verificarAutenticacion();
    await this.cargarAgendaDelDia();
  }

  verificarAutenticacion() {
    const token = sessionStorage.getItem('medico_session_token');
    if (!token) {
      console.warn('[AgendaMedica] Intento de acceso no autorizado.');
    }
  }

  async cargarAgendaDelDia() {
    if (!this.tablaCuerpo) return;

    try {
      const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (error) throw error;

      if (!turnos || turnos.length === 0) {
        this.tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center;">No existen turnos agendados en la planilla.</td></tr>`;
        return;
      }

      this.renderizarTabla(turnos);
    } catch (err) {
      console.error('[AgendaMedica Error]:', err.message);
    }
  }

  renderizarTabla(turnos) {
    this.tablaCuerpo.innerHTML = '';
    turnos.forEach(turno => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td><strong>${turno.fecha} - ${turno.hora} hs</strong></td>
        <td>${turno.paciente_nombre} ${turno.paciente_apellido}</td>
        <td>${turno.paciente_telefono}</td>
        <td>${turno.medico_nombre}</td>
        <td><span class="badge-estado">Confirmado</span></td>
      `;
      this.tablaCuerpo.appendChild(fila);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AgendaMedicaController();
});