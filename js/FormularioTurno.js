class FormularioTurnoController {
  constructor() {
    // 1. Cargar contexto de selección y sesión
    this.medicoId = localStorage.getItem('medico_seleccionado_id');
    this.medicoNombre = localStorage.getItem('medico_seleccionado_nombre');
    this.usuarioAnonimoId = localStorage.getItem('usuario_anonimo_id') || this.obtenerOcrearIdAnonimo();

    // 2. Mapeo de elementos del DOM
    this.lblMedico = document.getElementById('nombreMedico') || document.querySelector('.profesional-nombre');
    this.form = document.getElementById('formReserva') || document.querySelector('form');
    this.inputFecha = document.getElementById('fecha') || document.getElementById('fechaTurno') || document.querySelector('input[type="date"]');
    this.selectHora = document.getElementById('hora') || document.getElementById('horario') || document.querySelector('select');
    this.btnConfirmar = document.querySelector('button[type="submit"]') || document.querySelector('.btn-confirmar');

    // Elementos de Obra Social / Prepaga
    this.selectObraSocial = document.getElementById('obraSocialSelect');
    this.grupoObraSocialOtra = document.getElementById('grupoObraSocialOtra');
    this.inputObraSocialEspecifique = document.getElementById('obraSocialEspecifique');

    // Elementos del Modal Customizado de Alerta (Confirmación Éxito) y Botón de WhatsApp
    this.modalCustomAlert = document.getElementById('customAlert');
    this.btnCloseCustomAlert = document.getElementById('closeAlertBtn');
    this.btnWhatsApp = document.getElementById('btnWhatsAppConfirmacion');

    // Elementos opcionales del Modal estilizado de Vacaciones (si existe en el DOM)
    this.modalVacaciones = document.getElementById('modalVacaciones');
    this.modalMensaje = document.getElementById('modalMensajeVacaciones');
    this.btnEntendi = document.getElementById('btnEntendiVacaciones');

    this.init();
  }

  init() {
    // Validación de seguridad: debe existir un médico válido seleccionado
    if (!this.medicoId || !this.medicoNombre || this.medicoNombre === 'undefined') {
      alert('Por favor, seleccione un profesional médico primero.');
      window.location.href = 'ListaMedicos.html';
      return;
    }

    // Renderizar nombre del profesional
    if (this.lblMedico) {
      this.lblMedico.textContent = `Profesional: ${this.medicoNombre}`;
    }

    // Configurar límite de fecha (hoy como mínimo hora local)
    if (this.inputFecha) {
      const hoyLocal = new Date();
      const ano = hoyLocal.getFullYear();
      const mes = String(hoyLocal.getMonth() + 1).padStart(2, '0');
      const dia = String(hoyLocal.getDate()).padStart(2, '0');
      
      this.inputFecha.min = `${ano}-${mes}-${dia}`;
      this.inputFecha.addEventListener('change', () => this.gestionarDisponibilidadHorarios());
    }

    // =========================================================================
    // MÁSCARAS DE ENTRADA Y FORMATEADORES EN TIEMPO REAL (DNI Y TELÉFONO)
    // =========================================================================
    const inputDni = document.getElementById('pacienteDni');
    const inputTelefono = document.getElementById('telefono') || document.getElementById('telefonoContacto');

    // Bloquear caracteres no numéricos en DNI (Máximo 8 dígitos)
    if (inputDni) {
      inputDni.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
      });
    }

    // Formatear e indicar validez del teléfono automáticamente mientras se escribe
    if (inputTelefono) {
      const statusIcon = document.getElementById('phoneStatusIcon');
      const helpText = document.getElementById('phoneHelpText');

      inputTelefono.addEventListener('input', (e) => {
        let num = e.target.value.replace(/\D/g, ''); // Solo dígitos
        if (num.length > 10) num = num.slice(0, 10);

        // Enmascaramiento dinámico (Ej: 351 123-4567)
        if (num.length > 6) {
          e.target.value = `${num.slice(0, 3)} ${num.slice(3, 6)}-${num.slice(6)}`;
        } else if (num.length > 3) {
          e.target.value = `${num.slice(0, 3)} ${num.slice(3)}`;
        } else {
          e.target.value = num;
        }

        // Feedback visual en tiempo real
        if (statusIcon && helpText) {
          if (num.length === 10) {
            statusIcon.textContent = '✓';
            statusIcon.className = 'phone-status-icon valid';
            helpText.textContent = 'Número válido para recepción de WhatsApp.';
            helpText.className = 'form-help-text';
          } else if (num.length > 0) {
            statusIcon.textContent = '✕';
            statusIcon.className = 'phone-status-icon invalid';
            helpText.textContent = `Faltan ${10 - num.length} dígitos (incluye código de área sin 0).`;
            helpText.className = 'form-help-text error';
          } else {
            statusIcon.textContent = '';
            helpText.textContent = 'Ingresa tu número con código de área (sin 0 ni 15).';
            helpText.className = 'form-help-text';
          }
        }
      });
    }

    // Configurar botón del modal de vacaciones si existe en el DOM
    if (this.btnEntendi && this.modalVacaciones) {
      this.btnEntendi.addEventListener('click', () => {
        this.modalVacaciones.classList.add('hidden');
      });
    }

    // Listener para el botón del Modal Customizado de Éxito
    if (this.btnCloseCustomAlert) {
      this.btnCloseCustomAlert.addEventListener('click', () => {
        if (this.modalCustomAlert) {
          this.modalCustomAlert.classList.remove('active');
        }
        window.location.href = 'MisTurnos.html';
      });
    }

    // Listener para el botón de Enviar/Guardar Recordatorio en WhatsApp
    if (this.btnWhatsApp) {
      this.btnWhatsApp.addEventListener('click', () => this.enviarConfirmacionWhatsApp());
    }

    // Listener para la confirmación de la reserva
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.procesarReservaTurno(e));
    }
  }

  obtenerOcrearIdAnonimo() {
    const nuevoId = 'ANON-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('usuario_anonimo_id', nuevoId);
    return nuevoId;
  }

  /**
   * Genera el enlace dinámico con los datos de la reserva y abre WhatsApp
   */
  enviarConfirmacionWhatsApp() {
    const medico = this.medicoNombre || "su profesional";
    const fecha = this.inputFecha ? this.inputFecha.value : "la fecha seleccionada";
    const hora = this.selectHora ? this.selectHora.value : "la hora seleccionada";

    const mensaje = `Hola, este es el recordatorio de mi turno en *TurnoSalud*:\n\n` +
                    `👨‍⚕️ *Profesional:* ${medico}\n` +
                    `📅 *Fecha:* ${fecha}\n` +
                    `⏰ *Hora:* ${hora} hs\n\n` +
                    `Guardado desde la web oficial.`;

    const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  }

  /**
   * Muestra notificación de vacaciones mediante modal personalizado o alert fallback
   */
  notificarVacaciones(nombreMedico, fechaSeleccionadaStr) {
    if (this.modalVacaciones && this.modalMensaje) {
      this.modalMensaje.innerHTML = `El/La profesional <strong>${nombreMedico}</strong> se encuentra de vacaciones en la fecha elegida (<strong>${fechaSeleccionadaStr}</strong>). Por favor, seleccione otro día.`;
      this.modalVacaciones.classList.remove('hidden');
    } else if (typeof ListaMedicosController !== 'undefined' && ListaMedicosController.mostrarModalVacaciones) {
      ListaMedicosController.mostrarModalVacaciones(nombreMedico, fechaSeleccionadaStr);
    } else {
      alert(`⚠️ El/La profesional ${nombreMedico} se encuentra de vacaciones en la fecha elegida (${fechaSeleccionadaStr}). Por favor, seleccione otro día.`);
    }
  }

  /**
   * Muestra el modal customizado de confirmación exitosa
   */
  mostrarModalExito() {
    if (this.modalCustomAlert) {
      this.modalCustomAlert.classList.add('active');
    } else {
      alert('¡Turno médico agendado con éxito!');
      window.location.href = 'MisTurnos.html';
    }
  }

  /**
   * Consulta a Supabase si el médico tiene vacaciones vigentes en una fecha específica
   */
  async validarVacacionesEnFormulario(medicoId, fechaSeleccionadaStr) {
    const client = window.supabaseClient || window.supabase;
    if (!client || !medicoId || !fechaSeleccionadaStr) return false;

    try {
      // Intento 1: Consulta directa por rango de fechas (fecha_inicio <= fechaSeleccionada <= fecha_fin)
      const { data, error } = await client
        .from('vacaciones')
        .select('fecha_inicio, fecha_fin, motivo')
        .eq('medico_id', medicoId)
        .gte('fecha_inicio', fechaSeleccionadaStr)
        .lte('fecha_fin', fechaSeleccionadaStr);

      if (!error && data && data.length > 0) {
        return true;
      }

      // Intento 2: Consulta de respaldo y evaluación mediante instanciación Date local segura
      const { data: todasVacaciones, error: errorB } = await client
        .from('vacaciones')
        .select('fecha_inicio, fecha_fin')
        .eq('medico_id', medicoId);

      if (errorB || !todasVacaciones || todasVacaciones.length === 0) return false;

      const [anoSel, mesSel, diaSel] = fechaSeleccionadaStr.split('-');
      const fechaEvaluar = new Date(Number(anoSel), Number(mesSel) - 1, Number(diaSel), 0, 0, 0);

      return todasVacaciones.some(vac => {
        if (!vac.fecha_inicio || !vac.fecha_fin) return false;

        const [iAno, iMes, iDia] = vac.fecha_inicio.split('T')[0].split('-');
        const [fAno, fMes, fDia] = vac.fecha_fin.split('T')[0].split('-');

        const fInicio = new Date(Number(iAno), Number(iMes) - 1, Number(iDia), 0, 0, 0);
        const fFin = new Date(Number(fAno), Number(fMes) - 1, Number(fDia), 23, 59, 59);

        return fechaEvaluar >= fInicio && fechaEvaluar <= fFin;
      });

    } catch (err) {
      console.error('[FormularioTurno ValidarVacaciones Excepción]:', err);
      return false;
    }
  }

  async gestionarDisponibilidadHorarios() {
    const fechaSeleccionadaStr = this.inputFecha ? this.inputFecha.value : null;

    if (!fechaSeleccionadaStr || !this.selectHora) return;

    this.selectHora.innerHTML = '<option value="">Consultando disponibilidad médica...</option>';

    try {
      const client = window.supabaseClient || window.supabase;

      if (!client) {
        console.error('[FormularioTurno]: El cliente de Supabase no está disponible.');
        this.selectHora.innerHTML = '<option value="">Error de conexión con el servidor</option>';
        return;
      }

      // =========================================================================
      // 1. VALIDACIÓN DE VACACIONES
      // =========================================================================
      const estaDeVacaciones = await this.validarVacacionesEnFormulario(this.medicoId, fechaSeleccionadaStr);

      if (estaDeVacaciones) {
        this.notificarVacaciones(this.medicoNombre, fechaSeleccionadaStr);
        
        this.inputFecha.value = '';
        this.selectHora.innerHTML = '<option value="">Seleccione una fecha válida...</option>';
        if (this.btnConfirmar) this.btnConfirmar.disabled = true;
        return;
      }

      // Habilitar botón de confirmación si superó la prueba de vacaciones
      if (this.btnConfirmar) this.btnConfirmar.disabled = false;

      // =========================================================================
      // 2. CONSULTA DE HORARIOS DISPONIBLES
      // =========================================================================

      // A) Obtener todos los horarios plantilla del médico
      const { data: plantillaHorarios, error: errorHorarios } = await client
        .from('horarios')
        .select('id, hora, disponible')
        .eq('medico_id', this.medicoId)
        .eq('disponible', true)
        .order('hora', { ascending: true });

      if (errorHorarios) {
        console.error('[FormularioTurno Supabase Error plantilla]:', errorHorarios);
        throw errorHorarios;
      }

      // B) Obtener los turnos ya reservados para este médico en la FECHA seleccionada
      const { data: turnosOcupados, error: errorTurnos } = await client
        .from('turnos')
        .select('hora')
        .eq('medico_id', this.medicoId)
        .eq('fecha', fechaSeleccionadaStr);

      if (errorTurnos) {
        console.error('[FormularioTurno Supabase Error ocupados]:', errorTurnos);
        throw errorTurnos;
      }

      // Extraer las horas ocupadas en un Set de cadenas
      const horasReservadas = new Set(
        (turnosOcupados || []).map(t => t.hora.toString().substring(0, 5))
      );

      // C) Filtrar solo los horarios libres para esa fecha
      const horariosDisponibles = (plantillaHorarios || []).filter(slot => {
        const horaCorta = slot.hora.toString().substring(0, 5);
        return !horasReservadas.has(horaCorta);
      });

      if (horariosDisponibles.length === 0) {
        this.selectHora.innerHTML = '<option value="">Sin turnos disponibles para esta fecha</option>';
        return;
      }

      // D) Población dinámica de los horarios disponibles
      this.selectHora.innerHTML = '<option value="">Selecciona un horario disponible</option>';

      horariosDisponibles.forEach(slot => {
        const horaFormateada = slot.hora.toString().substring(0, 5);
        const option = document.createElement('option');
        
        option.value = horaFormateada;
        option.dataset.horarioId = slot.id;
        option.textContent = `${horaFormateada} hs`;

        this.selectHora.appendChild(option);
      });

    } catch (err) {
      console.error('[FormularioTurno Error]:', err.message || err);
      this.selectHora.innerHTML = '<option value="">Error de conexión con la agenda</option>';
    }
  }

  async procesarReservaTurno(e) {
    e.preventDefault();

    if (!this.selectHora || !this.selectHora.value || !this.inputFecha || !this.inputFecha.value) {
      alert('Por favor complete la fecha y seleccione un horario válido.');
      return;
    }

    // PREVENCIÓN DE DOBLE SUBMIT Y ESTADO DE CARGA
    if (this.btnConfirmar) {
      this.btnConfirmar.disabled = true;
      this.btnConfirmar.dataset.originalText = this.btnConfirmar.textContent;
      this.btnConfirmar.textContent = 'Agendando cita...';
    }

    const fechaSeleccionadaStr = this.inputFecha.value;

    // Revalidación de seguridad previa al Submit para evitar desincronizaciones
    const estaDeVacaciones = await this.validarVacacionesEnFormulario(this.medicoId, fechaSeleccionadaStr);
    if (estaDeVacaciones) {
      this.notificarVacaciones(this.medicoNombre, fechaSeleccionadaStr);
      this.inputFecha.value = '';
      this.selectHora.innerHTML = '<option value="">Seleccione una fecha válida...</option>';
      
      if (this.btnConfirmar) {
        this.btnConfirmar.disabled = false;
        this.btnConfirmar.textContent = this.btnConfirmar.dataset.originalText;
      }
      return;
    }

    // 1. Obtener los elementos de la interfaz
    const inputNombre = document.getElementById('nombre') || document.getElementById('nombrePaciente');
    const inputApellido = document.getElementById('apellido') || document.getElementById('apellidoPaciente');
    const inputDni = document.getElementById('pacienteDni');
    const inputTelefono = document.getElementById('telefono') || document.getElementById('telefonoContacto');

    // 2. Validación estricta de DNI previa al procesamiento
    const dniValido = inputDni ? inputDni.value.trim() : '';

    if (!/^\d{7,8}$/.test(dniValido)) {
      alert('Por favor ingrese un número de DNI válido (7 u 8 dígitos).');
      if (this.btnConfirmar) {
        this.btnConfirmar.disabled = false;
        this.btnConfirmar.textContent = this.btnConfirmar.dataset.originalText;
      }
      return;
    }

    // 3. Determinar el texto final de la Obra Social / Mutual
    let obraSocialFinal = '';
    if (this.selectObraSocial && this.selectObraSocial.value) {
      if (this.selectObraSocial.value === 'OTRA' && this.inputObraSocialEspecifique) {
        obraSocialFinal = this.inputObraSocialEspecifique.value.trim();
      } else {
        obraSocialFinal = this.selectObraSocial.value;
      }
    }

    // 4. Formatear el apellido concatenando la cobertura y el DNI para mantener retrocompatibilidad sin tocar la BD
    const apellidoBase = inputApellido ? inputApellido.value.trim() : '';
    let apellidoConCobertura = apellidoBase;

    if (obraSocialFinal) {
      apellidoConCobertura += ` (${obraSocialFinal})`;
    }
    apellidoConCobertura += ` - DNI: ${dniValido}`;

    // 5. Estructura exacta compatible con Supabase
    const payload = {
      usuario_anonimo_id: this.usuarioAnonimoId,
      medico_id: this.medicoId,
      medico_nombre: this.medicoNombre,
      paciente_nombre: inputNombre ? inputNombre.value.trim() : '',
      paciente_apellido: apellidoConCobertura,
      paciente_telefono: inputTelefono ? inputTelefono.value.trim() : '',
      fecha: fechaSeleccionadaStr,
      hora: this.selectHora.value,
      estado: 'confirmado'
    };

    try {
      const client = window.supabaseClient || window.supabase;

      if (!client) {
        throw new Error('El cliente de Supabase no se encuentra activo.');
      }

      // Registrar la cita en la tabla 'turnos'
      const { error: insertError } = await client
        .from('turnos')
        .insert([payload]);

      if (insertError) throw insertError;

      // Mostrar el modal customizado de éxito
      this.mostrarModalExito();

    } catch (err) {
      console.error('[FormularioTurno Submit Error]:', err.message || err);
      alert('Ocurrió un inconveniente al agendar la cita. Por favor reintente.');

      // Restaurar estado del botón en caso de error
      if (this.btnConfirmar) {
        this.btnConfirmar.disabled = false;
        this.btnConfirmar.textContent = this.btnConfirmar.dataset.originalText;
      }
    }
  }
}

// Funciones globales de evaluación y ayuda para interactuar con los eventos HTML inline
function evaluarObraSocial(valorSeleccionado) {
  const grupoOtra = document.getElementById('grupoObraSocialOtra');
  const inputOtra = document.getElementById('obraSocialEspecifique');

  if (grupoOtra && inputOtra) {
    if (valorSeleccionado === 'OTRA') {
      grupoOtra.classList.remove('hidden');
      inputOtra.setAttribute('required', 'true');
      inputOtra.focus();
    } else {
      grupoOtra.classList.add('hidden');
      inputOtra.removeAttribute('required');
      inputOtra.value = '';
    }
  }
}

function mostrarAyudaReserva() {
  const modal = document.getElementById('modalAyuda');
  if (modal) modal.style.display = 'flex';
}

function cerrarAyudaReserva() {
  const modal = document.getElementById('modalAyuda');
  if (modal) modal.style.display = 'none';
}

async function validarVacacionesEnFormulario(medicoId, fechaSeleccionada) {
  if (window.formularioController) {
    return await window.formularioController.validarVacacionesEnFormulario(medicoId, fechaSeleccionada);
  }
  return false;
}

function enviarConfirmacionWhatsApp() {
  if (window.formularioController) {
    window.formularioController.enviarConfirmacionWhatsApp();
  }
}

window.evaluarObraSocial = evaluarObraSocial;
window.mostrarAyudaReserva = mostrarAyudaReserva;
window.cerrarAyudaReserva = cerrarAyudaReserva;
window.validarVacacionesEnFormulario = validarVacacionesEnFormulario;
window.enviarConfirmacionWhatsApp = enviarConfirmacionWhatsApp;
window.FormularioTurnoController = FormularioTurnoController;

document.addEventListener('DOMContentLoaded', () => {
  window.formularioController = new FormularioTurnoController();
});