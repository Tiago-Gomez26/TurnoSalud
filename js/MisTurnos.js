/**
 * ============================================================================
 * TURNOSALUD - CONSULTA DE RESERVAS DEL PACIENTE (MisTurnos.js)
 * Historial Institucional del Dispositivo
 * ============================================================================
 */

class MisTurnosController {
  constructor() {
    this.anonId = localStorage.getItem('usuario_anonimo_id');
    this.contenedor = document.getElementById('listaTurnos');
    this.init();
  }

  async init() {
    await this.recuperarTurnosReservados();
  }

  async recuperarTurnosReservados() {
    if (!this.contenedor) return;

    if (!this.anonId) {
      this.contenedor.innerHTML = '<p class="text-center" style="color: #64748b;">No existen registros de turnos agendados en este equipo.</p>';
      return;
    }

    try {
      const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*')
        .eq('usuario_anonimo_id', this.anonId)
        .order('fecha', { ascending: true });

      if (error) throw error;

      if (!turnos || turnos.length === 0) {
        this.contenedor.innerHTML = '<p class="text-center" style="color: #64748b;">No registra turnos activos actualmente.</p>';
        return;
      }

      this.renderizarHistorial(turnos);
    } catch (err) {
      console.error('[MisTurnos Error]:', err.message);
      this.contenedor.innerHTML = '<p class="text-center" style="color: #ef4444;">No fue posible sincronizar el historial de turnos.</p>';
    }
  }

  renderizarHistorial(turnos) {
    this.contenedor.innerHTML = '';
    turnos.forEach(t => {
      const card = document.createElement('div');
      card.className = 'turno-card';
      card.innerHTML = `
        <h3>${t.medico_nombre}</h3>
        <span class="fecha-hora">📅 Fecha: ${t.fecha} — ⏰ Hora: ${t.hora} hs</span>
        <p><strong>Paciente Registrado:</strong> ${t.paciente_nombre} ${t.paciente_apellido}</p>
        <p><strong>Contacto:</strong> ${t.paciente_telefono}</p>
      `;
      this.contenedor.appendChild(card);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MisTurnosController();
});