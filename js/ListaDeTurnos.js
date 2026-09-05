/* ============================================================================
   TURNOSALUD - LÓGICA DE LISTA DE TURNOS Y REGISTRO DE VACACIONES (js/ListaDeTurnos.js)
   ============================================================================ */

/**
 * Muestra el modal de registro de vacaciones.
 */
function abrirModalVacaciones() {
  const modal = document.getElementById('modalVacaciones');
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Cierra el modal de registro de vacaciones y reinicia sus campos.
 */
function cerrarModalVacaciones() {
  const modal = document.getElementById('modalVacaciones');
  if (modal) {
    modal.style.display = 'none';
    const form = document.getElementById('formVacaciones');
    if (form) {
      form.reset();
    }
  }
}

/**
 * Controla la obtención, filtrado y renderizado de la agenda de turnos médicos.
 */
class AgendaMedicaController {
  constructor() {
    this.tablaCuerpo = document.getElementById('cuerpoTablaTurnos');
    this.lblInfoMedico = document.getElementById('infoMedicoLogueado');
    this.medicoLogueado = null;
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
      const client = window.supabaseClient || window.supabase;

      if (!client) {
        throw new Error('El cliente de Supabase no se encuentra inicializado.');
      }

      // 1. Obtener la sesión activa de Supabase Auth
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      
      console.log('--- DEPURACIÓN DE SESIÓN ---');
      console.log('Sesión activa:', session);

      if (sessionError || !session) {
        console.warn('[AgendaMedica] No se detectó sesión activa en Supabase Auth.');
      }

      const userId = session ? session.user.id : null;
      const userEmail = session ? session.user.email : null;
      console.log('User ID actual de la sesión:', userId);

      // 2. Verificar si el usuario autenticado es un médico en la tabla 'medicos'
      if (userId) {
        const { data: medicoData, error: medicoError } = await client
          .from('medicos')
          .select('id, nombre, especialidad, user_id')
          .eq('user_id', userId)
          .maybeSingle();

        console.log('Resultado búsqueda de médico en DB:', medicoData);

        if (medicoError) {
          console.error('[AgendaMedica] Error al verificar perfil médico:', medicoError.message);
        } else if (medicoData) {
          this.medicoLogueado = medicoData;
          console.log(`[AgendaMedica] Sesión iniciada exitosamente como Médico: ${medicoData.nombre} (ID Médico: ${medicoData.id})`);
        } else {
          console.warn('⚠️ ATENCIÓN: Se inició sesión con Auth pero no se encontró ninguna fila en la tabla medicos donde user_id sea igual a:', userId);
        }
      }

      // 3. Construir la consulta a la tabla 'turnos'
      let query = client.from('turnos').select('*');

      if (this.medicoLogueado) {
        // SI ES MÉDICO: Filtrar ÚNICAMENTE por su medico_id
        console.log(`Aplicando filtro: turnos.medico_id == ${this.medicoLogueado.id}`);
        query = query.eq('medico_id', this.medicoLogueado.id);
      } else {
        // SI ES ADMINISTRACIÓN / GENERAL: Cargar todos los turnos
        console.log(`[AgendaMedica] Mostrando vista general/administración (${userEmail || 'Sin sesión'})`);
      }

      // 4. Ordenar por fecha y hora
      const { data: turnos, error: turnosError } = await query
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (turnosError) throw turnosError;

      console.log('Turnos obtenidos de la base de datos:', turnos);

      if (!turnos || turnos.length === 0) {
        this.tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center;">No existen turnos agendados en la planilla.</td></tr>`;
        return;
      }

      this.renderizarTabla(turnos);

    } catch (err) {
      console.error('[AgendaMedica Error]:', err.message);
      this.tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Error al cargar la agenda de turnos.</td></tr>`;
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

// Inicialización de componentes al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  // Instanciar el controlador de la agenda
  new AgendaMedicaController();

  // Escuchar el evento submit del formulario de registro de vacaciones
  const formVacaciones = document.getElementById('formVacaciones');

  if (formVacaciones) {
    formVacaciones.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fechaInicio = document.getElementById('vacInicio').value;
      const fechaFin = document.getElementById('vacFin').value;
      const motivo = document.getElementById('vacMotivo').value.trim() || 'Vacaciones';

      if (new Date(fechaInicio) > new Date(fechaFin)) {
        alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
        return;
      }

      const client = window.supabaseClient || window.supabase;

      if (!client) {
        alert('Error: El cliente de Supabase no se encuentra inicializado.');
        return;
      }

      // Obtener sesión activa del médico autenticado
      const { data: { session }, error: sessionError } = await client.auth.getSession();

      if (sessionError || !session) {
        alert('Debe estar autenticado para registrar un período de vacaciones.');
        return;
      }

      try {
        // Obtener el ID del médico correspondiente al usuario autenticado
        const { data: medicoData, error: medicoErr } = await client
          .from('medicos')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (medicoErr) throw medicoErr;

        // Utilizar el ID del médico encontrado o, si no existe en la relación, el ID del Auth
        const medicoId = medicoData ? medicoData.id : session.user.id;

        const { error } = await client
          .from('vacaciones')
          .insert([
            {
              medico_id: medicoId,
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFin,
              motivo: motivo
            }
          ]);

        if (error) throw error;

        alert('Período de vacaciones guardado exitosamente.');
        cerrarModalVacaciones();

      } catch (err) {
        console.error('Error al registrar vacaciones:', err.message);
        alert('Ocurrió un error al guardar el registro: ' + err.message);
      }
    });
  }
});