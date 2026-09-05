class PanelAdministracionController {
  constructor() {
    // ----------------------------------------------------------------------
    // 1. MÉTRICAS Y DASHBOARD
    // ----------------------------------------------------------------------
    this.lblReservaTotales = document.getElementById('totalReservas') || document.getElementById('totalTurnos');
    this.lblStaffTotales = document.getElementById('totalStaff') || document.getElementById('totalMedicos');

    // ----------------------------------------------------------------------
    // 2. NAVEGACIÓN PRINCIPAL Y SECCIONES
    // ----------------------------------------------------------------------
    this.btnVerAgenda = document.getElementById('btnVerAgenda');
    this.btnGestionarMedicos = document.getElementById('btnGestionarMedicos');
    this.btnAjustesSistema = document.getElementById('btnAjustesSistema');

    this.secAgenda = document.getElementById('secAgendaGeneral');
    this.secMedicos = document.getElementById('secGestionMedicos');
    this.secAjustes = document.getElementById('secAjustesSistema');

    // ----------------------------------------------------------------------
    // 3. TABLAS Y FORMULARIOS
    // ----------------------------------------------------------------------
    this.tablaAgenda = document.getElementById('cuerpoTablaAgendaAdmin');
    this.tablaMedicos = document.getElementById('cuerpoTablaMedicosAdmin');
    this.formNuevoMedico = document.getElementById('formAgregarMedico');
    this.btnEliminarTurnosAntiguos = document.getElementById('btnDepurarTurnos');

    // ----------------------------------------------------------------------
    // 4. MODALES PERSONALIZADOS DE CONFIRMACIÓN Y ÉXITO (DOM EXISTENTE)
    // ----------------------------------------------------------------------
    this.confirmModal = document.getElementById('confirmDeleteModal');
    this.successModal = document.getElementById('successDeleteModal');
    this.confirmMessageEl = document.getElementById('confirmDeleteMessage');
    this.successMessageEl = document.getElementById('successDeleteMessage');

    this.btnDismiss = document.getElementById('btnDeleteDismiss');
    this.btnConfirm = document.getElementById('btnDeleteConfirm');
    this.btnSuccessOk = document.getElementById('btnDeleteSuccessOk');

    // Estado temporal para eliminación activa
    this.profesionalAEliminar = null;

    this.init();
  }

  /**
   * Inicialización del flujo administrativo
   */
  async init() {
    console.log('%c[TurnoSalud Admin Core] Inicializando panel de control institucional...', 'color: #008080; font-weight: bold;');
    
    this.configurarEventosModales();
    await this.verificarAutenticacionAdmin();
    await this.cargarMetricasDashboard();
    this.vincularEventos();
  }

  // ========================================================================
  // HELPER PARA DIÁLOGOS MODALES DINÁMICOS EN TIEMPO DE EJECUCIÓN
  // ========================================================================

  mostrarModalAlerta(titulo, mensaje, icono = 'info') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-custom-overlay active';
      
      overlay.innerHTML = `
        <div class="modal-custom-card">
          <div class="modal-custom-icon ${icono}"></div>
          <h3 class="modal-custom-title">${titulo}</h3>
          <div class="modal-custom-body">${mensaje}</div>
          <div class="modal-custom-actions">
            <button class="btn-modal-primary" id="btnCustomOk">Aceptar</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#btnCustomOk').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
    });
  }

  mostrarModalConfirmacion(titulo, mensaje) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-custom-overlay active';

      overlay.innerHTML = `
        <div class="modal-custom-card">
          <div class="modal-custom-icon warning"></div>
          <h3 class="modal-custom-title">${titulo}</h3>
          <div class="modal-custom-body">${mensaje}</div>
          <div class="modal-custom-actions">
            <button class="btn-modal-secondary" id="btnCustomCancel">Cancelar</button>
            <button class="btn-modal-danger" id="btnCustomConfirm">Confirmar</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#btnCustomCancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });

      overlay.querySelector('#btnCustomConfirm').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
    });
  }

  // ========================================================================
  // CONTROL DE MODALES INTERACTIVOS DEL DOM
  // ========================================================================

  configurarEventosModales() {
    // Cancelar la acción de borrado
    if (this.btnDismiss) {
      this.btnDismiss.addEventListener('click', () => {
        if (this.confirmModal) this.confirmModal.classList.remove('active');
        this.profesionalAEliminar = null;
      });
    }

    // Confirmar la eliminación definitiva
    if (this.btnConfirm) {
      this.btnConfirm.addEventListener('click', async () => {
        if (this.confirmModal) this.confirmModal.classList.remove('active');
        if (this.profesionalAEliminar) {
          const { id, nombre } = this.profesionalAEliminar;
          await this.ejecutarEliminacionEnBaseDeDatos(id, nombre);
          this.profesionalAEliminar = null;
        }
      });
    }

    // Aceptar en el modal de éxito
    if (this.btnSuccessOk) {
      this.btnSuccessOk.addEventListener('click', () => {
        if (this.successModal) this.successModal.classList.remove('active');
        this.cargarListaMedicos();
        this.cargarMetricasDashboard();
      });
    }
  }

  /**
   * Muestra el modal de confirmación antes de eliminar a un médico
   * @param {string|number} idMedico 
   * @param {string} nombreMedico 
   */
  async solicitarEliminacionProfesional(idMedico, nombreMedico) {
    this.profesionalAEliminar = { id: idMedico, nombre: nombreMedico };

    if (this.confirmModal && this.confirmMessageEl) {
      this.confirmMessageEl.innerHTML = `¿Está seguro de que desea eliminar permanentemente al profesional <strong>"${nombreMedico}"</strong>, sus horarios y su cuenta de acceso (Auth)?`;
      this.confirmModal.classList.add('active');
    } else {
      // Usar modal dinámico en caso de que los elementos del DOM no existan
      const confirmacion = await this.mostrarModalConfirmacion(
        '¿Eliminar Profesional?',
        `¿Está seguro de que desea eliminar permanentemente al profesional <strong>"${nombreMedico}"</strong>, sus horarios asignados y su cuenta de acceso?`
      );
      if (confirmacion) {
        await this.ejecutarEliminacionEnBaseDeDatos(idMedico, nombreMedico);
      }
    }
  }

  // ========================================================================
  // SEGURIDAD Y MÉTRICAS DE DASHBOARD
  // ========================================================================

  async verificarAutenticacionAdmin() {
    try {
      if (typeof supabase !== 'undefined') {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.warn('[AdminPanel] No hay sesión activa. Redirigiendo al login...');
          window.location.href = 'login.html'; 
          return;
        }

        console.log('[AdminPanel] Sesión validada correctamente para:', session.user.email);
      }
    } catch (err) {
      console.error('[AdminPanel Error Auth]:', err);
    }
  }

  async cargarMetricasDashboard() {
    try {
      if (typeof supabase !== 'undefined') {
        const { count: countTurnos, error: errTurnos } = await supabase
          .from('turnos')
          .select('*', { count: 'exact', head: true });

        if (!errTurnos && this.lblReservaTotales) {
          this.lblReservaTotales.textContent = countTurnos !== null ? countTurnos : '0';
        }

        const { count: countMedicos, error: errMedicos } = await supabase
          .from('medicos')
          .select('*', { count: 'exact', head: true });

        if (!errMedicos && this.lblStaffTotales) {
          this.lblStaffTotales.textContent = countMedicos !== null ? countMedicos : '0';
        }
      } else {
        console.warn('[AdminPanel] Supabase client no está definido en el contexto global.');
      }
    } catch (err) {
      console.error('[AdminDashboard Metrics Exception]:', err);
    }
  }

  // ========================================================================
  // ENLACE DE EVENTOS DEL DOM
  // ========================================================================

  vincularEventos() {
    if (this.btnVerAgenda) {
      this.btnVerAgenda.addEventListener('click', () => this.abrirSeccionAgenda());
    }
    if (this.btnGestionarMedicos) {
      this.btnGestionarMedicos.addEventListener('click', () => this.abrirSeccionMedicos());
    }
    if (this.btnAjustesSistema) {
      this.btnAjustesSistema.addEventListener('click', () => this.abrirSeccionAjustes());
    }
    if (this.formNuevoMedico) {
      this.formNuevoMedico.addEventListener('submit', (e) => this.agregarMedico(e));
    }
    if (this.btnEliminarTurnosAntiguos) {
      this.btnEliminarTurnosAntiguos.addEventListener('click', () => this.depurarTurnosPasados());
    }
  }

  // ========================================================================
  // GESTIÓN DE AGENDA GENERAL
  // ========================================================================

  async abrirSeccionAgenda() {
    this.ocultarTodasLasSecciones();
    if (this.secAgenda) {
      this.secAgenda.style.display = 'block';
      this.secAgenda.classList.remove('display-none');
    }
    await this.cargarAgendaGeneral();
  }

  async cargarAgendaGeneral() {
    console.log('[AdminPanel] Cargando la agenda general de turnos ordenados...');
    
    if (!this.tablaAgenda) return;
    this.tablaAgenda.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cargando turnos agendados...</td></tr>`;

    try {
      if (typeof supabase === 'undefined') throw new Error('Cliente Supabase no disponible.');

      const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (error) throw error;

      this.tablaAgenda.innerHTML = '';

      if (!turnos || turnos.length === 0) {
        this.tablaAgenda.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay turnos registrados en la base de datos.</td></tr>`;
        return;
      }

      turnos.forEach(t => {
        const fila = document.createElement('tr');
        
        const fechaHoraText = `${t.fecha || 'Sin Fecha'} - ${t.hora || '--:--'} hs`;
        const pacienteText = t.paciente_nombre ? `${t.paciente_nombre} ${t.paciente_apellido || ''}` : (t.paciente || 'Paciente');
        const telefonoText = t.paciente_telefono || t.telefono || 'N/A';
        const medicoText = t.medico_nombre || t.medico || 'No asignado';
        const estadoText = t.estado || 'Agendado';

        fila.innerHTML = `
          <td><strong>${fechaHoraText}</strong></td>
          <td>${pacienteText}</td>
          <td>${telefonoText}</td>
          <td>${medicoText}</td>
          <td><span class="badge-estado">${estadoText}</span></td>
        `;
        this.tablaAgenda.appendChild(fila);
      });

    } catch (err) {
      console.error('[AdminPanel Error Cargar Agenda]:', err.message);
      this.tablaAgenda.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Error al obtener la agenda de turnos.</td></tr>`;
    }
  }

  // ========================================================================
  // GESTIÓN Y CARTILLA DE MÉDICOS
  // ========================================================================

  async abrirSeccionMedicos() {
    this.ocultarTodasLasSecciones();
    if (this.secMedicos) {
      this.secMedicos.style.display = 'block';
      this.secMedicos.classList.remove('display-none');
    }
    await this.cargarListaMedicos();
  }

  async cargarListaMedicos() {
    console.log('[AdminPanel] Cargando la cartilla de profesionales activos...');

    if (!this.tablaMedicos) return;
    this.tablaMedicos.innerHTML = `<tr><td colspan="4" style="text-align:center;">Cargando lista de médicos...</td></tr>`;

    try {
      if (typeof supabase === 'undefined') throw new Error('Cliente Supabase no disponible.');

      const { data: medicos, error: errMedicos } = await supabase
        .from('medicos')
        .select('*')
        .order('nombre', { ascending: true });

      if (errMedicos) throw errMedicos;

      const { data: horariosData } = await supabase
        .from('horarios')
        .select('*');

      this.tablaMedicos.innerHTML = '';

      if (!medicos || medicos.length === 0) {
        this.tablaMedicos.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay profesionales registrados actualmente.</td></tr>`;
        return;
      }

      medicos.forEach(m => {
        const fila = document.createElement('tr');
        
        let listaHorarios = [];
        if (horariosData) {
          listaHorarios = horariosData
            .filter(h => String(h.medico_id) === String(m.id))
            .map(h => h.hora)
            .filter(Boolean);
        }

        let horariosText = 'Sin horario asignado';
        if (listaHorarios.length > 0) {
          horariosText = `${listaHorarios[0].slice(0,5)} - ${listaHorarios[listaHorarios.length - 1].slice(0,5)} hs (${listaHorarios.length} bloques)`;
        }

        fila.innerHTML = `
          <td><strong>${m.nombre}</strong></td>
          <td>${m.especialidad}</td>
          <td><span class="badge-horario">${horariosText}</span></td>
          <td style="text-align:center;">
            <button class="btn-delete-action btn-danger-sm" data-id="${m.id}">Eliminar</button>
          </td>
        `;

        const btnEliminar = fila.querySelector('.btn-danger-sm');
        btnEliminar.addEventListener('click', () => this.solicitarEliminacionProfesional(m.id, m.nombre));

        this.tablaMedicos.appendChild(fila);
      });

    } catch (err) {
      console.error('[AdminPanel Error Cargar Médicos]:', err.message);
      this.tablaMedicos.innerHTML = `<tr><td colspan="4" style="text-align:center; color: red;">Error al cargar el cuerpo médico.</td></tr>`;
    }
  }

  /**
   * Convierte un string tipo "08:00 - 11:00" o "08:00, 08:30" a un arreglo de horas HH:MM:SS
   */
  generarBloquesHorarios(input) {
    if (!input) return [];
    
    if (input.includes(',')) {
      return input.split(',').map(h => {
        let limpia = h.trim();
        return limpia.length === 5 ? `${limpia}:00` : limpia;
      });
    }

    if (input.includes('-')) {
      const [inicioStr, finStr] = input.split('-').map(s => s.trim());
      const bloques = [];
      
      let [hIni, mIni] = inicioStr.split(':').map(Number);
      let [hFin, mFin] = finStr.split(':').map(Number);

      let minInicio = hIni * 60 + mIni;
      let minFin = hFin * 60 + mFin;

      for (let min = minInicio; min <= minFin; min += 30) {
        let hh = Math.floor(min / 60).toString().padStart(2, '0');
        let mm = (min % 60).toString().padStart(2, '0');
        bloques.push(`${hh}:${mm}:00`);
      }
      return bloques;
    }

    const horaUnica = input.trim();
    return [horaUnica.length === 5 ? `${horaUnica}:00` : horaUnica];
  }

  async agregarMedico(e) {
    e.preventDefault();

    const nombreInput = document.getElementById('nuevoNombreMedico');
    const especialidadInput = document.getElementById('nuevaEspecialidadMedico');
    const horarioInput = document.getElementById('nuevoHorarioMedico');
    const emailInput = document.getElementById('nuevoEmailMedico');
    const passwordInput = document.getElementById('nuevaPasswordMedico');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const especialidad = especialidadInput ? especialidadInput.value.trim() : '';
    const horariosString = horarioInput ? horarioInput.value.trim() : '';
    let email = emailInput ? emailInput.value.trim() : '';
    let password = passwordInput ? passwordInput.value.trim() : '';

    if (!nombre || !especialidad) {
      await this.mostrarModalAlerta('Campos incompletos', 'Por favor, complete los campos obligatorios del profesional (Nombre y Especialidad).', 'warning');
      return;
    }

    if (!email) {
      const nombreFormateado = nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sufijoUnico = Math.floor(1000 + Math.random() * 9000);
      email = `${nombreFormateado}${sufijoUnico}@turnosalud.com`;
    }

    if (!password) {
      password = `Medico.${Math.floor(100000 + Math.random() * 900000)}`;
    }

    try {
      if (typeof supabase === 'undefined') throw new Error('Cliente Supabase no disponible.');

      console.log('[AdminPanel] Registrando usuario en Supabase Authentication...', { email, nombre });

      let authClient = supabase;
      if (typeof supabase.createClient === 'function' && supabase.supabaseUrl && supabase.supabaseKey) {
        authClient = supabase.createClient(supabase.supabaseUrl, supabase.supabaseKey, {
          auth: { persistSession: false }
        });
      }

      let userId = null;

      // 1. Crear Usuario en Auth de Supabase
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nombre_completo: nombre,
            especialidad: especialidad,
            rol: 'medico'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered') || authError.message.includes('already exists')) {
          console.warn('[AdminPanel Auth] El usuario ya existía en Authentication, reintentando con email único...');
          const emailReintento = email.replace('@', `${Date.now().toString().slice(-4)}@`);
          const { data: authRetry } = await authClient.auth.signUp({
            email: emailReintento,
            password: password,
            options: { data: { nombre_completo: nombre, especialidad: especialidad, rol: 'medico' } }
          });
          userId = authRetry?.user?.id || authRetry?.session?.user?.id || null;
          email = emailReintento;
        } else if (!authError.message.includes('rate limit')) {
          console.error('[AdminPanel Auth Error]:', authError.message);
        }
      } else {
        userId = authData?.user?.id || (authData?.session?.user?.id) || null;
      }

      console.log('[AdminPanel Auth Success] UUID de Auth capturado:', userId);

      // 2. Insertar campos en la tabla 'medicos'
      const medicoPayload = {};
      medicoPayload.nombre = nombre;
      medicoPayload.especialidad = especialidad;
      if (userId) {
        medicoPayload.user_id = userId;
      }

      const { data: medicoInsertado, error: medicoError } = await supabase
        .from('medicos')
        .insert([medicoPayload])
        .select()
        .single();

      if (medicoError) {
        console.error('[Error de Inserción en Médicos]:', medicoError);
        throw new Error(`Error en la tabla medicos: ${medicoError.message} (${medicoError.details || ''})`);
      }

      const medicoId = medicoInsertado.id;
      console.log('[AdminPanel DB Success] Registro creado en tabla medicos con ID:', medicoId);

      // 3. Guardar bloques de horarios en la tabla 'horarios'
      if (horariosString) {
        const bloques = this.generarBloquesHorarios(horariosString);
        
        if (bloques.length > 0) {
          const registrosHorarios = bloques.map(hora => ({
            medico_id: medicoId,
            hora: hora,
            disponible: true
          }));

          const { error: errHorarios } = await supabase
            .from('horarios')
            .insert(registrosHorarios);

          if (errHorarios) {
            console.error('[AdminPanel Error Horarios]:', errHorarios.message);
          } else {
            console.log('[AdminPanel Horarios Success] Bloques guardados en la tabla horarios.');
          }
        }
      }

      await this.mostrarModalAlerta(
        '¡Profesional registrado!',
        `<p>Se ha creado el usuario en Authentication con éxito:</p>
         <div class="credentials-box">
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Contraseña:</strong> ${password}</p>
         </div>`,
        'success'
      );

      if (this.formNuevoMedico) this.formNuevoMedico.reset();
      await this.cargarListaMedicos();
      await this.cargarMetricasDashboard();

    } catch (err) {
      console.error('[AdminPanel Error Agregar Médico]:', err.message || err);
      await this.mostrarModalAlerta('Error de Registro', `Ocurrió un error al registrar al profesional:<br>${err.message || err}`, 'danger');
    }
  }

  /**
   * Procesa la eliminación en Supabase y activa el modal de confirmación de éxito
   */
  async ejecutarEliminacionEnBaseDeDatos(idMedico, nombreMedico) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente Supabase no disponible.');

      console.log(`[AdminPanel] Ejecutando depuración completa mediante RPC para médico ID: ${idMedico}`);

      // 1. Intentar ejecución de la función almacenada RPC en Supabase
      const { error } = await client.rpc('eliminar_medico_completo', {
        p_medico_id: idMedico
      });

      if (error) {
        console.warn('[AdminPanel] Falló la eliminación vía RPC, intentando método de eliminación directa en cascada...');
        
        // Estrategia de respaldo (Fallback)
        await client
          .from('turnos')
          .delete()
          .or(`medico_id.eq.${idMedico},medico_nombre.eq.${nombreMedico}`);

        await client
          .from('horarios')
          .delete()
          .eq('medico_id', idMedico);

        const { error: errMedicoManual } = await client
          .from('medicos')
          .delete()
          .eq('id', idMedico);

        if (errMedicoManual) throw errMedicoManual;
      }

      // Notificación vía Modal
      if (this.successModal && this.successMessageEl) {
        this.successMessageEl.innerHTML = `El profesional <strong>"${nombreMedico}"</strong> y sus registros asociados han sido eliminados correctamente de la base de datos.`;
        this.successModal.classList.add('active');
      } else {
        await this.mostrarModalAlerta(
          'Eliminación Exitosa',
          `El profesional <strong>"${nombreMedico}"</strong> y sus registros asociados han sido eliminados correctamente de la base de datos.`,
          'success'
        );
        await this.cargarListaMedicos();
        await this.cargarMetricasDashboard();
      }

    } catch (err) {
      console.error('[AdminPanel Error Eliminar Médico Completo]:', err);
      await this.mostrarModalAlerta('Error de Eliminación', `Error al intentar eliminar la ficha del médico:<br>${err.message || err.details || 'Error desconocido'}`, 'danger');
    }
  }

  // ========================================================================
  // MANTENIMIENTO Y AJUSTES DEL SISTEMA
  // ========================================================================

  abrirSeccionAjustes() {
    this.ocultarTodasLasSecciones();
    if (this.secAjustes) {
      this.secAjustes.style.display = 'block';
      this.secAjustes.classList.remove('display-none');
    }
  }

  async depurarTurnosPasados() {
    const confirmacion = await this.mostrarModalConfirmacion(
      'Depuración de Turnos Antiguos',
      '<strong>ADVERTENCIA DE SEGURIDAD:</strong> Se eliminarán de forma permanente e irreversible todos los turnos del mes pasado (fechas anteriores al día 1 del mes en curso). ¿Desea ejecutar esta depuración?'
    );

    if (!confirmacion) return;

    try {
      if (typeof supabase === 'undefined') throw new Error('Cliente Supabase no disponible.');

      const hoy = new Date();
      const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      const { error } = await supabase
        .from('turnos')
        .delete()
        .lt('fecha', primerDiaMesActual);

      if (error) throw error;

      await this.mostrarModalAlerta(
        'Mantenimiento Completado',
        'La base de datos ha sido depurada y los registros antiguos han sido removidos con éxito.',
        'success'
      );
      await this.cargarMetricasDashboard();

    } catch (err) {
      console.error('[AdminPanel Error Depuración]:', err.message);
      await this.mostrarModalAlerta('Error de Limpieza', 'No se pudo completar la limpieza automática de la base de datos.', 'danger');
    }
  }

  ocultarTodasLasSecciones() {
    const secciones = [this.secAgenda, this.secMedicos, this.secAjustes];
    secciones.forEach(sec => {
      if (sec) {
        sec.style.display = 'none';
        sec.classList.add('display-none');
      }
    });
  }
}

// Instanciación única global en la carga del documento
document.addEventListener('DOMContentLoaded', () => {
  window.AdminPanel = new PanelAdministracionController();
});