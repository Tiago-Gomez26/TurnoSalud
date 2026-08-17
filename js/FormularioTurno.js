/**
 * ============================================================================
 * TURNOSALUD - RESERVA Y AGENDAMIENTO (FormularioTurno.js)
 * Lógica de Validación de Agenda, Bloqueo de Horarios Ocupados e Inserción
 * ============================================================================
 */

class FormularioTurnoController {
  constructor() {
    this.horariosBase = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '16:00', '16:30', '17:00'];
    this.medicoId = localStorage.getItem('medico_seleccionado_id') || '1';
    this.medicoNombre = localStorage.getItem('medico_seleccionado_nombre') || 'Profesional Médico';
    this.anonId = localStorage.getItem('usuario_anonimo_id');

    this.lblMedico = document.getElementById('nombreMedico');
    this.inputFecha = document.getElementById('fecha');
    this.selectHora = document.getElementById('hora');
    this.form = document.getElementById('formReserva');

    this.init();
  }

  init() {
    if (this.lblMedico) this.lblMedico.textContent = this.medicoNombre;
    
    if (this.inputFecha) {
      this.inputFecha.min = new Date().toISOString().split('T')[0];
      this.inputFecha.addEventListener('change', () => this.gestionarDisponibilidadHorarios());
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.procesarReservaTurno(e));
    }
  }

  async gestionarDisponibilidadHorarios() {
    const fechaSeleccionada = this.inputFecha.value;
    if (!fechaSeleccionada) return;

    this.selectHora.innerHTML = '<option value="">Consultando disponibilidad médica...</option>';

    try {
      const { data: turnosOcupados, error } = await supabase
        .from('turnos')
        .select('hora')
        .eq('medico_id', this.medicoId)
        .eq('fecha', fechaSeleccionada);

      if (error) throw error;

      const horasReservadas = turnosOcupados ? turnosOcupados.map(t => t.hora) : [];
      this.selectHora.innerHTML = '<option value="">Selecciona un horario disponible</option>';

      this.horariosBase.forEach(hora => {
        const option = document.createElement('option');
        option.value = hora;

        if (horasReservadas.includes(hora)) {
          option.textContent = `${hora} — (No disponible)`;
          option.disabled = true;
        } else {
          option.textContent = `${hora} hs`;
        }
        this.selectHora.appendChild(option);
      });

    } catch (err) {
      console.error('[FormularioTurno Error]:', err.message);
      this.selectHora.innerHTML = '<option value="">Error de conexión con agenda</option>';
    }
  }

  async procesarReservaTurno(e) {
    e.preventDefault();

    const payload = {
      usuario_anonimo_id: this.anonId,
      medico_id: this.medicoId,
      medico_nombre: this.medicoNombre,
      paciente_nombre: document.getElementById('nombre').value.trim(),
      paciente_apellido: document.getElementById('apellido').value.trim(),
      paciente_telefono: document.getElementById('telefono').value.trim(),
      fecha: this.inputFecha.value,
      hora: this.selectHora.value
    };

    try {
      const { error } = await supabase.from('turnos').insert([payload]);

      if (error) {
        alert('Ocurrió un inconveniente al confirmar su turno: ' + error.message);
      } else {
        alert(' Turno médico confirmado con éxito.');
        window.location.href = 'MisTurnos.html';
      }
    } catch (err) {
      console.error('[FormularioTurno Submit Error]:', err);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormularioTurnoController();
});