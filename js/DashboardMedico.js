class DashboardMedicoController {
  constructor() {
    this.medicoId = localStorage.getItem('medico_id') || localStorage.getItem('medico_seleccionado_id');
    this.medicoNombre = localStorage.getItem('medico_nombre') || localStorage.getItem('medico_seleccionado_nombre');

    // Mapeo del DOM
    this.lblMedicoNombre = document.getElementById('lblMedicoNombre');
    this.inputFechaAgenda = document.getElementById('fechaAgenda');
    this.contenedorTurnos = document.getElementById('contenedorTurnos');
    
    // Modal Bloqueo Horarios
    this.btnBloquearHorario = document.getElementById('btnBloquearHorario');
    this.modalBloqueo = document.getElementById('modalBloqueo');
    this.btnCerrarModalBloqueo = document.getElementById('btnCerrarModalBloqueo');
    this.formBloqueoHorario = document.getElementById('formBloqueoHorario');
    this.inputBloqueoFecha = document.getElementById('bloqueoFecha');
    this.selectBloqueoHora = document.getElementById('bloqueoHora');
    
    this.btnLogout = document.getElementById('btnLogout');

    this.init();
  }

  init() {
    if (!this.medicoId) {
      alert('Sesión no identificada. Inicie sesión nuevamente.');
      window.location.href = 'Login.html';
      return;
    }

    if (this.lblMedicoNombre) {
      this.lblMedicoNombre.textContent = `Dr/a. ${this.medicoNombre || ''}`;
    }

    // Configurar fecha de la agenda (Hoy por defecto)
    if (this.inputFechaAgenda) {
      const hoy = new Date();
      const ano = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      
      const fechaHoyStr = `${ano}-${mes}-${dia}`;
      this.inputFechaAgenda.value = fechaHoyStr;
      
      this.inputFechaAgenda.addEventListener('change', () => this.cargarAgendaDelDia());
    }

    // Listeners del Modal de Bloqueo
    if (this.btnBloquearHorario) {
      this.btnBloquearHorario.addEventListener('click', () => this.abrirModalBloqueo());
    }

    if (this.btnCerrarModalBloqueo) {
      this.btnCerrarModalBloqueo.addEventListener('click', () => this.cerrarModalBloqueo());
    }

    if (this.inputBloqueoFecha) {
      this.inputBloqueoFecha.addEventListener('change', () => this.cargarHorariosDisponiblesParaBloqueo());
    }

    if (this.formBloqueoHorario) {
      this.formBloqueoHorario.addEventListener('submit', (e) => this.procesarBloqueoHorario(e));
    }

    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'Login.html';
      });
    }

    this.cargarAgendaDelDia();
  }

  /**
   * Carga los turnos reservados para el médico en la fecha seleccionada
   */
  async cargarAgendaDelDia() {
    const fechaSeleccionada = this.inputFechaAgenda ? this.inputFechaAgenda.value : null;

    if (!fechaSeleccionada || !this.contenedorTurnos) return;

    this.contenedorTurnos.innerHTML = '<tr><td colspan="5" class="texto-cargando">Cargando turnos de la agenda...</td></tr>';

    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente de Supabase no inicializado.');

      const { data: turnos, error } = await client
        .from('turnos')
        .select('*')
        .eq('medico_id', this.medicoId)
        .eq('fecha', fechaSeleccionada)
        .order('hora', { ascending: true });

      if (error) throw error;

      if (!turnos || turnos.length === 0) {
        this.contenedorTurnos.innerHTML = '<tr><td colspan="5" class="texto-vacio">No hay turnos ni bloqueos registrados para este día.</td></tr>';
        return;
      }

      this.contenedorTurnos.innerHTML = '';

      turnos.forEach(turno => {
        const tr = document.createElement('tr');
        tr.className = `fila-estado-${turno.estado}`;

        const horaFormateada = turno.hora.toString().substring(0, 5);
        const pacienteNombre = turno.paciente_nombre || 'No especificado';
        const pacienteApellido = turno.paciente_apellido || '';
        const telefono = turno.paciente_telefono || 'Sin teléfono';
        const estadoActual = turno.estado || 'confirmado';

        tr.innerHTML = `
          <td><strong>${horaFormateada} hs</strong></td>
          <td>${pacienteNombre} ${pacienteApellido}</td>
          <td>${telefono}</td>
          <td><span class="badge-estado badge-${estadoActual}">${estadoActual.toUpperCase()}</span></td>
          <td>
            <div class="btn-group-acciones">
              <button type="button" class="btn-accion btn-atendido" onclick="dashboardController.cambiarEstadoTurno('${turno.id}', 'atendido')" ${estadoActual === 'atendido' ? 'disabled' : ''}>Atendido</button>
              <button type="button" class="btn-accion btn-ausente" onclick="dashboardController.cambiarEstadoTurno('${turno.id}', 'ausente')" ${estadoActual === 'ausente' ? 'disabled' : ''}>Ausente</button>
              <button type="button" class="btn-accion btn-cancelado" onclick="dashboardController.cambiarEstadoTurno('${turno.id}', 'cancelado')" ${estadoActual === 'cancelado' ? 'disabled' : ''}>Cancelar</button>
            </div>
          </td>
        `;

        this.contenedorTurnos.appendChild(tr);
      });

    } catch (err) {
      console.error('[DashboardMedico Error Carga]:', err.message || err);
      this.contenedorTurnos.innerHTML = '<tr><td colspan="5" class="texto-error">Error al obtener la agenda. Reintente.</td></tr>';
    }
  }

  /**
   * Cambia de forma directa el estado del turno (Atendido, Ausente o Cancelado)
   */
  async cambiarEstadoTurno(turnoId, nuevoEstado) {
    if (!turnoId || !nuevoEstado) return;

    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente de Supabase no disponible.');

      const { error } = await client
        .from('turnos')
        .update({ estado: nuevoEstado })
        .eq('id', turnoId);

      if (error) throw error;

      this.cargarAgendaDelDia();

    } catch (err) {
      console.error('[DashboardMedico Error Estado]:', err.message || err);
      alert('No se pudo actualizar el estado de la cita.');
    }
  }

  // =========================================================================
  // BLOQUEO MANUAL DE HORARIOS PUNTUALES
  // =========================================================================

  abrirModalBloqueo() {
    if (this.modalBloqueo) {
      this.modalBloqueo.style.display = 'flex';
      
      // Establecer fecha por defecto en el modal
      if (this.inputBloqueoFecha && this.inputFechaAgenda) {
        this.inputBloqueoFecha.value = this.inputFechaAgenda.value;
        this.cargarHorariosDisponiblesParaBloqueo();
      }
    }
  }

  cerrarModalBloqueo() {
    if (this.modalBloqueo) {
      this.modalBloqueo.style.display = 'none';
      if (this.formBloqueoHorario) this.formBloqueoHorario.reset();
    }
  }

  /**
   * Carga los horarios que están libres para poder bloquearlos de forma puntual
   */
  async cargarHorariosDisponiblesParaBloqueo() {
    const fechaBloqueo = this.inputBloqueoFecha ? this.inputBloqueoFecha.value : null;
    if (!fechaBloqueo || !this.selectBloqueoHora) return;

    this.selectBloqueoHora.innerHTML = '<option value="">Cargando horarios...</option>';

    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente de Supabase no activo.');

      // 1. Obtener la plantilla de horarios
      const { data: plantilla, error: errPlantilla } = await client
        .from('horarios')
        .select('hora')
        .eq('medico_id', this.medicoId)
        .eq('disponible', true)
        .order('hora', { ascending: true });

      if (errPlantilla) throw errPlantilla;

      // 2. Obtener ocupados o bloqueados previamente
      const { data: ocupados, error: errOcupados } = await client
        .from('turnos')
        .select('hora')
        .eq('medico_id', this.medicoId)
        .eq('fecha', fechaBloqueo);

      if (errOcupados) throw errOcupados;

      const horasOcupadasSet = new Set((ocupados || []).map(o => o.hora.toString().substring(0, 5)));

      const horasDisponibles = (plantilla || []).filter(item => {
        const hCorta = item.hora.toString().substring(0, 5);
        return !horasOcupadasSet.has(hCorta);
      });

      if (horasDisponibles.length === 0) {
        this.selectBloqueoHora.innerHTML = '<option value="">No hay horarios libres para bloquear en esta fecha</option>';
        return;
      }

      this.selectBloqueoHora.innerHTML = '<option value="" disabled selected>Seleccione un horario...</option>';
      horasDisponibles.forEach(item => {
        const horaStr = item.hora.toString().substring(0, 5);
        const opt = document.createElement('option');
        opt.value = horaStr;
        opt.textContent = `${horaStr} hs`;
        this.selectBloqueoHora.appendChild(opt);
      });

    } catch (err) {
      console.error('[DashboardMedico Horarios Bloqueo Error]:', err.message || err);
      this.selectBloqueoHora.innerHTML = '<option value="">Error al cargar horarios</option>';
    }
  }

  /**
   * Crea un registro de turno con estado 'bloqueado' para invalidar la hora puntual
   */
  async procesarBloqueoHorario(e) {
    e.preventDefault();

    const fecha = this.inputBloqueoFecha.value;
    const hora = this.selectBloqueoHora.value;
    const motivoInput = document.getElementById('bloqueoMotivo');
    const motivo = motivoInput ? motivoInput.value.trim() : '';

    if (!fecha || !hora) {
      alert('Seleccione la fecha y el horario a bloquear.');
      return;
    }

    const payloadBloqueo = {
      usuario_anonimo_id: 'BLOQUEO-MEDICO',
      medico_id: this.medicoId,
      medico_nombre: this.medicoNombre || 'Médico',
      paciente_nombre: 'BLOQUEO DE AGENDA',
      paciente_apellido: motivo ? `(${motivo})` : '(Imprevisto / Trámite)',
      paciente_telefono: 'N/A',
      fecha: fecha,
      hora: hora,
      estado: 'bloqueado'
    };

    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente de Supabase no disponible.');

      const { error } = await client
        .from('turnos')
        .insert([payloadBloqueo]);

      if (error) throw error;

      alert(`El horario de las ${hora} hs ha sido bloqueado exitosamente.`);
      this.cerrarModalBloqueo();
      
      // Si el bloqueo fue para la fecha visible en el dashboard, actualizar la tabla
      if (this.inputFechaAgenda && this.inputFechaAgenda.value === fecha) {
        this.cargarAgendaDelDia();
      }

    } catch (err) {
      console.error('[DashboardMedico Submit Bloqueo Error]:', err.message || err);
      alert('No se pudo efectuar el bloqueo del horario. Verifique que la hora esté libre.');
    }
  }
}

// Exponer la instancia al scope global para los eventos inline onclick
window.DashboardMedicoController = DashboardMedicoController;

document.addEventListener('DOMContentLoaded', () => {
  window.dashboardController = new DashboardMedicoController();
});