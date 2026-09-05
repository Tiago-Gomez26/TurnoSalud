/* ============================================================================
   TURNOSALUD - MÓDULO UNIFICADO COMPLETO
   Controlador de Agenda Médica, Catálogo de Médicos, Notificaciones y Vacaciones
   ============================================================================ */

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

/**
 * Controla el catálogo de médicos, notificaciones de licencias y validación de vacaciones.
 */
class ListaMedicosController {
  constructor() {
    this.contenedorMedicos = document.getElementById('contenedorMedicos');
    this.btnCampana = document.getElementById('btnNotificacionesVacaciones');
    this.panelNotificaciones = document.getElementById('panelNotificaciones');
    this.btnCerrarPanel = document.getElementById('btnCerrarPanel');
    this.badgeNotificacion = document.getElementById('badgeNotificacion');
    this.listaAvisos = document.getElementById('listaAvisosVacaciones');

    // Elementos del Modal de Vacaciones
    this.modalVacaciones = document.getElementById('modalVacaciones');
    this.modalMensaje = document.getElementById('modalMensajeVacaciones');
    this.btnEntendi = document.getElementById('btnEntendiVacaciones');

    this.vacacionesCargadas = [];
    this.init();
  }

  async init() {
    this.configurarEventosUI();

    // 1. Cargar la lista completa de médicos activos
    await this.cargarStaffMedico();

    // 2. Cargar avisos, notificaciones y aplicar bloqueos sobre los médicos
    const client = window.supabaseClient || window.supabase;
    if (client) {
      await this.cargarAvisosYDisponibilidad(client);
    } else {
      console.warn('[ListaMedicos]: El cliente de Supabase no está disponible aún.');
    }

    // 3. Asignar eventos a los botones "Elegir" presentes en la interfaz
    this.asignarEventosBotonesElegir();
  }

  configurarEventosUI() {
    // Alternar visibilidad del panel al pulsar la campana
    if (this.btnCampana && this.panelNotificaciones) {
      this.btnCampana.addEventListener('click', () => {
        this.panelNotificaciones.classList.toggle('hidden');
      });
    }

    if (this.btnCerrarPanel && this.panelNotificaciones) {
      this.btnCerrarPanel.addEventListener('click', () => {
        this.panelNotificaciones.classList.add('hidden');
      });
    }

    // Configuración del botón para marcar avisos como leídos
    const btnMarcarLeidos = document.getElementById('btnMarcarLeidos');
    if (btnMarcarLeidos) {
      btnMarcarLeidos.addEventListener('click', () => {
        this.marcarAvisosComoLeidos();
      });
    }

    // Evento para cerrar el modal de vacaciones al hacer clic en 'Entendí'
    if (this.btnEntendi && this.modalVacaciones) {
      this.btnEntendi.addEventListener('click', () => {
        this.modalVacaciones.classList.add('hidden');
      });
    }
  }

  // Cargar lista de médicos activos
  async cargarStaffMedico() {
    try {
      const client = window.supabaseClient || window.supabase;

      if (!client) {
        throw new Error('El cliente de Supabase no se encuentra inicializado.');
      }

      // Consulta directa a la tabla 'medicos' solo profesionales activos
      const { data: medicos, error } = await client
        .from('medicos')
        .select('*')
        .eq('activo', true);

      if (error) {
        console.error('[ListaMedicos Error Supabase]:', error.message || error);
        return;
      }

      if (!medicos || medicos.length === 0) {
        console.info('[ListaMedicos]: No se encontraron médicos activos registrados.');
        if (this.contenedorMedicos) {
          this.contenedorMedicos.innerHTML = '<p class="sin-datos">No hay profesionales disponibles en este momento.</p>';
        }
        return;
      }

      this.renderizarMedicos(medicos);

    } catch (err) {
      console.error('[ListaMedicos Excepción]:', err.message || err);
    }
  }

  // Renderizar médicos en pantalla con evento en el botón "Elegir"
  renderizarMedicos(medicos) {
    if (!this.contenedorMedicos) return;
    this.contenedorMedicos.innerHTML = '';

    medicos.forEach(medico => {
      const idMedicoStr = String(medico.id);
      const nombreMedico = medico.nombre || medico.nombre_completo || 'Profesional Médico';
      const especialidad = medico.especialidad || 'Especialista';

      const card = document.createElement('article');
      card.className = 'medico-card';
      card.setAttribute('data-medico-id', idMedicoStr);
      card.setAttribute('data-nombre', nombreMedico);
      card.setAttribute('data-especialidad', especialidad);
      if (medico.clinica) {
        card.setAttribute('data-clinica', medico.clinica);
      }

      card.innerHTML = `
        <div class="medico-info">
          <h3>${nombreMedico}</h3>
          <p><span class="icon-spec">🩺</span> ${especialidad}</p>
        </div>
        <div class="contenedor-aviso-vacaciones" style="display:none; margin: 10px 0;"></div>
        <button type="button" class="btn-seleccionar btn-solicitar" data-id="${idMedicoStr}" data-nombre="${nombreMedico}">
          Elegir
        </button>
      `;

      // EventListener dinámico seguro para procesar la selección
      const btnElegir = card.querySelector('.btn-solicitar');
      btnElegir.addEventListener('click', (e) => {
        e.preventDefault();
        this.procesarSeleccionMedico(idMedicoStr, nombreMedico, card);
      });

      this.contenedorMedicos.appendChild(card);
    });
  }

  // Asignación de eventos a botones "Elegir" estáticos o agregados dinámicamente
  asignarEventosBotonesElegir() {
    const botonesElegir = document.querySelectorAll('.btn-elegir, button.btn-confirmar, .card-medico button, .btn-seleccionar');

    botonesElegir.forEach(boton => {
      boton.addEventListener('click', async (e) => {
        if (boton.dataset.eventoAsignado) return;
        boton.dataset.eventoAsignado = 'true';

        const tarjeta = boton.closest('.medico-card') || boton.closest('.card-medico') || boton.parentElement;
        const medicoId = boton.dataset.id || boton.dataset.medicoId || tarjeta?.dataset?.medicoId || tarjeta?.dataset?.id;
        const medicoNombre = boton.dataset.nombre || boton.dataset.medicoNombre || tarjeta?.querySelector('h3, .nombre-medico')?.textContent.trim();

        if (!medicoId) {
          console.error('[ListaMedicos]: No se pudo obtener el ID del médico.');
          return;
        }

        const hoyStr = new Date().toISOString().split('T')[0];
        const estaDeVacaciones = await this.verificarVacacionesMedico(medicoId, hoyStr);

        if (estaDeVacaciones) {
          e.preventDefault();
          e.stopPropagation();
          this.mostrarAvisoEnLista(tarjeta, medicoNombre || 'seleccionado/a', 'pronto');
          ListaMedicosController.mostrarModalVacaciones(medicoNombre || 'seleccionado/a', 'pronto');
        } else {
          ListaMedicosController.seleccionarMedico(medicoId, medicoNombre);
        }
      });
    });
  }

  // VERIFICACIÓN PRINCIPAL AL HACER CLIC EN "ELEGIR"
  async procesarSeleccionMedico(medicoId, nombreMedico, cardElement) {
    const client = window.supabaseClient || window.supabase;

    let estaDeVacaciones = false;
    let fechaFinVacaciones = '';

    if (client) {
      try {
        const { data: vacaciones } = await client
          .from('vacaciones')
          .select('fecha_inicio, fecha_fin')
          .eq('medico_id', medicoId);

        if (vacaciones && vacaciones.length > 0) {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);

          vacaciones.forEach(vac => {
            if (vac.fecha_inicio && vac.fecha_fin) {
              const [iA, iM, iD] = vac.fecha_inicio.split('T')[0].split('-');
              const [fA, fM, fD] = vac.fecha_fin.split('T')[0].split('-');

              const fInicio = new Date(Number(iA), Number(iM) - 1, Number(iD), 0, 0, 0);
              const fFin = new Date(Number(fA), Number(fM) - 1, Number(fD), 23, 59, 59);

              if (hoy >= fInicio && hoy <= fFin) {
                estaDeVacaciones = true;
                fechaFinVacaciones = `${fD}/${fM}/${fA}`;
              }
            }
          });
        }
      } catch (err) {
        console.error('[Error al verificar vacaciones]:', err);
      }
    }

    if (estaDeVacaciones) {
      // Muestra el mensaje en la tarjeta del profesional si el elemento existe
      if (cardElement) {
        this.mostrarAvisoEnLista(cardElement, nombreMedico, fechaFinVacaciones);
      }
      this.mostrarModalVacacionesInstancia(nombreMedico, fechaFinVacaciones);
    } else {
      ListaMedicosController.seleccionarMedico(medicoId, nombreMedico);
    }
  }

  async verificarVacacionesMedico(medicoId, fechaStr) {
    const client = window.supabaseClient || window.supabase;
    if (!client) return false;

    try {
      const { data: vacaciones, error } = await client
        .from('vacaciones')
        .select('fecha_inicio, fecha_fin')
        .eq('medico_id', medicoId);

      if (error || !vacaciones || vacaciones.length === 0) return false;

      const [ano, mes, dia] = fechaStr.split('-');
      const fechaEvaluar = new Date(Number(ano), Number(mes) - 1, Number(dia), 0, 0, 0);

      return vacaciones.some(vac => {
        if (!vac.fecha_inicio || !vac.fecha_fin) return false;

        const [iAno, iMes, iDia] = vac.fecha_inicio.split('T')[0].split('-');
        const [fAno, fMes, fDia] = vac.fecha_fin.split('T')[0].split('-');

        const fInicio = new Date(Number(iAno), Number(iMes) - 1, Number(iDia), 0, 0, 0);
        const fFin = new Date(Number(fAno), Number(fMes) - 1, Number(fDia), 23, 59, 59);

        return fechaEvaluar >= fInicio && fechaEvaluar <= fFin;
      });

    } catch (err) {
      console.error('[ListaMedicos Error]:', err);
      return false;
    }
  }

  // Consulta la tabla vacaciones y médicos para actualizar avisos y deshabilitar turnos
  async cargarAvisosYDisponibilidad(client) {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const { data: vacaciones, error } = await client
        .from('vacaciones')
        .select('id, medico_id, fecha_inicio, fecha_fin, motivo, medicos(nombre, especialidad)');

      if (error) throw error;

      if (!vacaciones || vacaciones.length === 0) {
        if (this.listaAvisos) {
          this.listaAvisos.innerHTML = '<p class="sin-avisos">No hay licencias programadas en este momento.</p>';
        }
        if (this.badgeNotificacion) {
          this.badgeNotificacion.classList.add('hidden');
        }
        this.vacacionesCargadas = [];
        localStorage.removeItem('vacaciones_activas_cache');
        return;
      }

      this.vacacionesCargadas = vacaciones;
      localStorage.setItem('vacaciones_activas_cache', JSON.stringify(vacaciones));

      const leidosGuardados = JSON.parse(localStorage.getItem('avisos_vacaciones_leidos') || '[]');
      const avisosNoLeidos = vacaciones.filter(vac => !leidosGuardados.includes(String(vac.id)));

      if (this.badgeNotificacion) {
        if (avisosNoLeidos.length > 0) {
          this.badgeNotificacion.textContent = avisosNoLeidos.length;
          this.badgeNotificacion.classList.remove('hidden');
        } else {
          this.badgeNotificacion.textContent = '0';
          this.badgeNotificacion.classList.add('hidden');
        }
      }

      if (this.listaAvisos) {
        this.listaAvisos.innerHTML = '';

        if (avisosNoLeidos.length === 0) {
          this.listaAvisos.innerHTML = '<p class="sin-avisos">No hay licencias sin leer.</p>';
        } else {
          avisosNoLeidos.forEach(vac => {
            const nombreMedico = vac.medicos ? (vac.medicos.nombre || vac.medicos.nombre_completo) : 'Médico';
            const item = document.createElement('div');
            item.className = 'item-aviso';
            item.innerHTML = `
              <strong>Dr./Dra. ${nombreMedico}</strong><br/>
              <small>Ausente del ${vac.fecha_inicio} al ${vac.fecha_fin}</small><br/>
              <small style="color: #64748b;">Motivo: ${vac.motivo || 'Licencia'}</small>
            `;
            this.listaAvisos.appendChild(item);
          });
        }
      }

      vacaciones.forEach(vac => {
        const [iAno, iMes, iDia] = vac.fecha_inicio.split('T')[0].split('-');
        const [fAno, fMes, fDia] = vac.fecha_fin.split('T')[0].split('-');

        const fInicio = new Date(Number(iAno), Number(iMes) - 1, Number(iDia), 0, 0, 0);
        const fFin = new Date(Number(fAno), Number(fMes) - 1, Number(fDia), 23, 59, 59);

        const enVacacionesHoy = hoy >= fInicio && hoy <= fFin;

        if (enVacacionesHoy) {
          const nombreMedico = vac.medicos ? (vac.medicos.nombre || vac.medicos.nombre_completo) : 'el médico';
          const fechaFormateada = `${fDia}/${fMes}/${fAno}`;
          this.bloquearTurnosMedico(vac.medico_id, fechaFormateada, nombreMedico);
        }
      });

    } catch (err) {
      console.error('[Notificaciones Error]:', err.message || err);
      if (this.listaAvisos) {
        this.listaAvisos.innerHTML = '<p class="sin-avisos" style="color: #ef4444;">Error al cargar las notificaciones.</p>';
      }
    }
  }

  async cargarAvisosNotificaciones(client) {
    await this.cargarAvisosYDisponibilidad(client);
  }

  // Deshabilita la interacción con las tarjetas del médico ausente
  bloquearTurnosMedico(medicoId, fechaFin, nombreMedico = 'el médico') {
    const idStr = String(medicoId);
    const tarjetaMedico = document.querySelector(`[data-medico-id="${idStr}"]`) || document.querySelector(`[data-id="${idStr}"]`);

    if (tarjetaMedico) {
      tarjetaMedico.classList.add('en-vacaciones');

      const btnSolicitar = tarjetaMedico.querySelector('.btn-solicitar') || tarjetaMedico.querySelector('.btn-seleccionar') || tarjetaMedico.querySelector('button');
      if (btnSolicitar) {
        btnSolicitar.classList.add('disabled');
        btnSolicitar.disabled = true;
        btnSolicitar.removeAttribute('onclick');
        btnSolicitar.textContent = 'No Disponible';

        const btnClonado = btnSolicitar.cloneNode(true);
        btnSolicitar.parentNode.replaceChild(btnClonado, btnSolicitar);

        btnClonado.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.mostrarAvisoEnLista(tarjetaMedico, nombreMedico, fechaFin);
          ListaMedicosController.mostrarModalVacaciones(nombreMedico, fechaFin);
          return false;
        });
      }

      if (!tarjetaMedico.querySelector('.badge-vacaciones-card')) {
        const infoContainer = tarjetaMedico.querySelector('.medico-info') || tarjetaMedico;
        const badgeVacaciones = document.createElement('span');
        badgeVacaciones.className = 'badge-vacaciones-card';
        badgeVacaciones.textContent = `🌴 De vacaciones hasta ${fechaFin}`;
        infoContainer.appendChild(badgeVacaciones);
      }
    }
  }

  // Muestra un mensaje directo en la tarjeta del médico seleccionado
  mostrarAvisoEnLista(cardElement, nombreMedico, fechaFin) {
    if (!cardElement) return;
    const contenedorAviso = cardElement.querySelector('.contenedor-aviso-vacaciones');
    const textoFecha = (fechaFin && fechaFin !== 'pronto') ? ` hasta el <strong>${fechaFin}</strong>` : '';

    if (contenedorAviso) {
      contenedorAviso.innerHTML = `
        <div class="aviso-vacaciones" style="background-color: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 10px; border-radius: 6px; font-size: 0.9em;">
          ⚠️ <strong>${nombreMedico}</strong> se encuentra de vacaciones${textoFecha}. No es posible agendar turnos actualmente.
        </div>
      `;
      contenedorAviso.style.display = 'block';
    }
  }

  marcarAvisosComoLeidos() {
    if (this.vacacionesCargadas && this.vacacionesCargadas.length > 0) {
      const leidosIds = this.vacacionesCargadas.map(v => String(v.id));
      localStorage.setItem('avisos_vacaciones_leidos', JSON.stringify(leidosIds));

      if (this.badgeNotificacion) {
        this.badgeNotificacion.textContent = '0';
        this.badgeNotificacion.classList.add('hidden');
      }

      if (this.listaAvisos) {
        this.listaAvisos.innerHTML = '<p class="sin-avisos">No hay licencias sin leer.</p>';
      }
    }
  }

  // Modal instancia de clase
  mostrarModalVacacionesInstancia(nombreMedico, fechaFin) {
    if (this.modalVacaciones && this.modalMensaje) {
      const textoFecha = (fechaFin && fechaFin !== 'pronto') ? ` hasta el <strong>${fechaFin}</strong>` : '';
      this.modalMensaje.innerHTML = `El/La profesional <strong>${nombreMedico || 'seleccionado/a'}</strong> se encuentra actualmente de vacaciones${textoFecha}. Durante este período no es posible agendar nuevos turnos.`;
      this.modalVacaciones.classList.remove('hidden');
    } else {
      alert(`El/La profesional ${nombreMedico} se encuentra de vacaciones hasta el ${fechaFin}.`);
    }
  }

  // Método alias para compatibilidad interna
  mostrarModalVacaciones(nombreMedico, fechaFin) {
    this.mostrarModalVacacionesInstancia(nombreMedico, fechaFin);
  }

  // Muestra el modal estilizado notificando las vacaciones del profesional (Método Estático)
  static mostrarModalVacaciones(nombreMedico, fechaFin) {
    const modal = document.getElementById('modalVacaciones');
    const mensaje = document.getElementById('modalMensajeVacaciones');

    if (modal && mensaje) {
      const textoFecha = (fechaFin && fechaFin !== 'pronto') ? ` hasta el <strong>${fechaFin}</strong>` : '';
      mensaje.innerHTML = `El/La profesional <strong>${nombreMedico || 'seleccionado/a'}</strong> se encuentra actualmente de vacaciones${textoFecha}. Durante este período no es posible agendar nuevos turnos.`;
      modal.classList.remove('hidden');
    } else {
      alert(`El/La profesional ${nombreMedico} se encuentra de vacaciones.`);
    }
  }

  // Guarda la selección del médico y redirige al formulario de turno
  static seleccionarMedico(id, nombre) {
    if (!id || !nombre || nombre === 'undefined') {
      console.error('[ListaMedicos Error]: Datos del médico no válidos para la selección.');
      return;
    }

    const idStr = String(id);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vacacionesCache = JSON.parse(localStorage.getItem('vacaciones_activas_cache') || '[]');

    let fechaFinVac = '';
    const estaDeVacaciones = vacacionesCache.some(vac => {
      if (String(vac.medico_id) !== idStr) return false;

      const [iAno, iMes, iDia] = vac.fecha_inicio.split('T')[0].split('-');
      const [fAno, fMes, fDia] = vac.fecha_fin.split('T')[0].split('-');

      const fInicio = new Date(Number(iAno), Number(iMes) - 1, Number(iDia), 0, 0, 0);
      const fFin = new Date(Number(fAno), Number(fMes) - 1, Number(fDia), 23, 59, 59);

      if (hoy >= fInicio && hoy <= fFin) {
        fechaFinVac = `${fDia}/${fMes}/${fAno}`;
        return true;
      }
      return false;
    });

    if (estaDeVacaciones) {
      const tarjetaMedico = document.querySelector(`[data-medico-id="${idStr}"]`) || document.querySelector(`[data-id="${idStr}"]`);
      if (window.listaMedicosController && tarjetaMedico) {
        window.listaMedicosController.mostrarAvisoEnLista(tarjetaMedico, nombre, fechaFinVac);
      }
      ListaMedicosController.mostrarModalVacaciones(nombre, fechaFinVac);
      return;
    }

    localStorage.setItem('medico_seleccionado_id', idStr);
    localStorage.setItem('medico_seleccionado_nombre', nombre);
    window.location.href = 'FormularioTurno.html';
  }
}

// Exponer métodos y clases al ámbito global
window.seleccionarMedico = ListaMedicosController.seleccionarMedico;
window.ListaMedicosController = ListaMedicosController;
window.AgendaMedicaController = AgendaMedicaController;

// Inicialización general de eventos al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  // 1. Instanciar controladores principales
  window.agendaMedicaController = new AgendaMedicaController();
  window.listaMedicosController = new ListaMedicosController();

  // 2. Lógica de Filtrado y Búsqueda Dinámica en Tiempo Real
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const noResultsMsg = document.getElementById('noResultsMsg');

  if (searchInput) {
    // Función principal de filtrado de tarjetas
    function filterMedicos() {
      const query = searchInput.value.toLowerCase().trim();
      const medicosCards = document.querySelectorAll('.medico-card');
      let visibleCount = 0;

      // Mostrar/ocultar botón de limpiar búsqueda
      if (clearSearchBtn) {
        if (query.length > 0) {
          clearSearchBtn.classList.remove('hidden');
        } else {
          clearSearchBtn.classList.add('hidden');
        }
      }

      // Iterar sobre cada tarjeta de médico
      medicosCards.forEach(card => {
        const nombre = (card.getAttribute('data-nombre') || '').toLowerCase();
        const especialidad = (card.getAttribute('data-especialidad') || '').toLowerCase();
        const clinica = (card.getAttribute('data-clinica') || '').toLowerCase();

        // Comprobar si la búsqueda coincide con alguno de los criterios
        const isMatch = nombre.includes(query) || 
                        especialidad.includes(query) || 
                        clinica.includes(query);

        if (isMatch) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      // Mostrar u ocultar mensaje de ausencia de coincidencias
      if (noResultsMsg) {
        if (visibleCount === 0 && medicosCards.length > 0) {
          noResultsMsg.classList.remove('hidden');
        } else {
          noResultsMsg.classList.add('hidden');
        }
      }
    }

    // Event listener para el input de búsqueda
    searchInput.addEventListener('input', filterMedicos);

    // Event listener para el botón de limpiar búsqueda
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterMedicos();
        searchInput.focus();
      });
    }
  }
});