class MisTurnosController {
  constructor() {
    this.anonId = localStorage.getItem('usuario_anonimo_id') || sessionStorage.getItem('usuario_anonimo_id');
    this.telefonoGuardado = localStorage.getItem('paciente_telefono') || sessionStorage.getItem('paciente_telefono');
    this.contenedor = document.getElementById('listaTurnos');

    // Referencias a elementos DOM de los Modales de Cancelación
    this.confirmModal = document.getElementById('confirmCancelModal');
    this.successModal = document.getElementById('successCancelModal');

    this.btnCancelDismiss = document.getElementById('btnCancelDismiss');
    this.btnCancelConfirm = document.getElementById('btnCancelConfirm');
    this.btnSuccessOk = document.getElementById('btnSuccessOk');

    // Estado interno para almacenar el ID del turno en proceso de baja
    this.turnoIdAProcesar = null;

    this.init();
  }

  async init() {
    console.log('[MisTurnosController] Inicializando controlador...');
    await this.recuperarTurnosReservados();
    this.configurarDelegacionEventos();
    this.configurarCierreMenusAlHacerClicFuera();
    this.configurarEventosModalesCancelacion();
  }

  /**
   * Configura los escuchadores de eventos para la interacción con los modales personalizados de cancelación
   */
  configurarEventosModalesCancelacion() {
    // 1. Botón "No, conservar" -> Cerrar modal sin cancelar
    if (this.btnCancelDismiss) {
      this.btnCancelDismiss.addEventListener('click', () => {
        if (this.confirmModal) this.confirmModal.classList.remove('active');
        this.turnoIdAProcesar = null;
      });
    }

    // 2. Botón "Sí, cancelar turno" -> Ejecutar baja en Supabase
    if (this.btnCancelConfirm) {
      this.btnCancelConfirm.addEventListener('click', async () => {
        if (this.confirmModal) this.confirmModal.classList.remove('active');
        if (this.turnoIdAProcesar) {
          await this.ejecutarCancelacionEnBaseDeDatos(this.turnoIdAProcesar);
        }
      });
    }

    // 3. Botón "Aceptar" del modal de Éxito -> Refrescar vista/DOM
    if (this.btnSuccessOk) {
      this.btnSuccessOk.addEventListener('click', async () => {
        if (this.successModal) this.successModal.classList.remove('active');
        
        // Eliminar tarjeta del DOM o recargar si la lista queda vacía
        if (this.turnoIdAProcesar) {
          const tarjetaDOM = document.querySelector(`[data-turno-id="${this.turnoIdAProcesar}"]`);
          if (tarjetaDOM) {
            tarjetaDOM.remove();
          }

          const tarjetasRestantes = document.querySelectorAll('.card-turno, .turno-card');
          if (tarjetasRestantes.length === 0) {
            await this.recuperarTurnosReservados();
          }
          this.turnoIdAProcesar = null;
        } else {
          window.location.reload();
        }
      });
    }
  }

  /**
   * Consulta en Supabase los turnos guardados utilizando el ID anónimo o el teléfono registrado
   */
  async recuperarTurnosReservados() {
    if (!this.contenedor) return;

    try {
      const client = window.supabaseClient || window.supabase;

      if (!client) {
        throw new Error('El cliente de Supabase no está disponible en la ventana global.');
      }

      // Si no hay identificadores locales guardados
      if (!this.anonId && !this.telefonoGuardado) {
        this.contenedor.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1;">
            <p style="color: #64748b; font-size: 1.1rem; margin-bottom: 10px;">No existen registros de turnos agendados en este equipo.</p>
            <a href="index.html" style="color: #007a78; font-weight: 600; text-decoration: underline;">Solicitar un nuevo turno</a>
          </div>
        `;
        return;
      }

      let query = client.from('turnos').select('*');

      // Filtro dinámico: prioriza por usuario_anonimo_id y como alternativa por teléfono
      if (this.anonId && this.telefonoGuardado) {
        query = query.or(`usuario_anonimo_id.eq.${this.anonId},paciente_telefono.eq.${this.telefonoGuardado}`);
      } else if (this.anonId) {
        query = query.eq('usuario_anonimo_id', this.anonId);
      } else if (this.telefonoGuardado) {
        query = query.eq('paciente_telefono', this.telefonoGuardado);
      }

      const { data: turnos, error } = await query.order('fecha', { ascending: true });

      if (error) throw error;

      if (!turnos || turnos.length === 0) {
        this.contenedor.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1;">
            <p style="color: #64748b; font-size: 1.1rem; margin-bottom: 10px;">No registra turnos activos actualmente.</p>
            <a href="index.html" style="color: #007a78; font-weight: 600; text-decoration: underline;">Solicitar un nuevo turno</a>
          </div>
        `;
        return;
      }

      this.renderizarHistorial(turnos);

    } catch (err) {
      console.error('[MisTurnos Error]:', err.message || err);
      this.contenedor.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #ef4444; background: #fef2f2; border-radius: 8px;">
          No fue posible sincronizar el historial de turnos. Por favor, vuelva a intentarlo más tarde.
        </div>
      `;
    }
  }

  /**
   * Renderiza el historial de turnos incorporando el botón de tres puntos (...) y menú desplegable
   */
  renderizarHistorial(turnos) {
    if (!this.contenedor) return;

    this.contenedor.innerHTML = '';

    turnos.forEach(t => {
      const idStr = String(t.id);
      const nombreMedico = t.medico_nombre || 'Dr. Profesional Asignado';
      const fecha = t.fecha || 'Sin Fecha';
      const hora = t.hora || 'Sin Hora';
      const pacienteNombre = `${t.paciente_nombre || ''} ${t.paciente_apellido || ''}`.trim() || 'Paciente Registrado';
      const contacto = t.paciente_telefono || 'No especificado';

      const card = document.createElement('article');
      card.className = 'card-turno turno-card';
      card.setAttribute('data-turno-id', idStr);

      card.innerHTML = `
        <div class="card-turno-contenido">
          <h3>${nombreMedico}</h3>
          <span class="fecha-hora">📅 <strong>Fecha:</strong> ${fecha} — ⏰ <strong>Hora:</strong> ${hora} hs</span>
          <p><strong>Paciente Registrado:</strong> ${pacienteNombre}</p>
          <p><strong>Contacto:</strong> ${contacto}</p>
        </div>

        <!-- Menú desplegable de tres puntos (...) -->
        <div class="menu-tres-puntos-contenedor">
          <button type="button" class="btn-tres-puntos" aria-label="Opciones del turno" title="Opciones">
            &#8942;
          </button>
          
          <div class="dropdown-menu-turno">
            <button type="button" class="dropdown-item btn-detalle" data-id="${idStr}">
              👁️ <span>Ver Detalle</span>
            </button>
            <button type="button" class="dropdown-item btn-reprogramar" data-id="${idStr}">
              📅 <span>Reprogramar</span>
            </button>
            <button type="button" class="dropdown-item btn-cancelar" data-id="${idStr}">
              ❌ <span>Cancelar Turno</span>
            </button>
          </div>
        </div>
      `;

      this.contenedor.appendChild(card);
    });
  }

  /**
   * Delegación de eventos para capturar clics en los tres puntos, ítems del menú y retrocompatibilidad
   */
  configurarDelegacionEventos() {
    document.addEventListener('click', async (e) => {
      // 1. Abrir / Cerrar Menú de tres puntos
      const btnTresPuntos = e.target.closest('.btn-tres-puntos');
      if (btnTresPuntos) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const contenedor = btnTresPuntos.closest('.menu-tres-puntos-contenedor');
        
        // Cerrar otros menús abiertos primero
        document.querySelectorAll('.menu-tres-puntos-contenedor.activo').forEach(m => {
          if (m !== contenedor) m.classList.remove('activo');
        });

        if (contenedor) {
          contenedor.classList.toggle('activo');
        }
        return;
      }

      // 2. Acciones del menú desplegable o botones de acción generales
      const btnItem = e.target.closest('.dropdown-item, .btn-cuadrado');
      if (!btnItem) return;

      const turnoId = btnItem.dataset.id;

      // Cerrar el menú desplegable activo si aplica
      const contenedorPadre = btnItem.closest('.menu-tres-puntos-contenedor');
      if (contenedorPadre) {
        contenedorPadre.classList.remove('activo');
      }

      // Disparar acción según la clase del botón
      if (btnItem.classList.contains('btn-detalle')) {
        await this.ejecutarVerDetalle(turnoId);
      } else if (btnItem.classList.contains('btn-reprogramar')) {
        this.ejecutarReprogramacion(turnoId);
      } else if (btnItem.classList.contains('btn-cancelar')) {
        this.solicitarCancelacionTurno(turnoId);
      }
    });
  }

  /**
   * Cierra el menú de tres puntos si el usuario hace clic fuera del contenedor activo
   */
  configurarCierreMenusAlHacerClicFuera() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu-tres-puntos-contenedor')) {
        document.querySelectorAll('.menu-tres-puntos-contenedor.activo').forEach(m => {
          m.classList.remove('activo');
        });
      }
    });
  }

  /**
   * Acción 1: Carga y muestra los detalles completos del turno dentro de la ventana emergente
   */
  async ejecutarVerDetalle(id) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente de Supabase no disponible.');

      const { data: turno, error } = await client
        .from('turnos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const cuerpoModal = document.getElementById('cuerpoModalDetalle');
      const modal = document.getElementById('modalDetalleTurno');

      if (cuerpoModal && modal) {
        cuerpoModal.innerHTML = `
          <p><strong>Profesional:</strong> ${turno.medico_nombre || 'N/A'}</p>
          <p><strong>Fecha Asignada:</strong> ${turno.fecha}</p>
          <p><strong>Hora Asignada:</strong> ${turno.hora} hs</p>
          <p><strong>Paciente:</strong> ${turno.paciente_nombre || ''} ${turno.paciente_apellido || ''}</p>
          <p><strong>Teléfono de Contacto:</strong> ${turno.paciente_telefono || 'N/A'}</p>
          <p><strong>Estado del Turno:</strong> <span style="color: #16a34a; font-weight: bold;">Confirmado</span></p>
        `;
        modal.style.display = 'flex';
      }
    } catch (err) {
      console.error('[Error al cargar detalles]:', err.message || err);
      alert('No se pudieron obtener los detalles de la cita seleccionada.');
    }
  }

  /**
   * Acción 2: Redirige a la vista de edición guardando el ID en almacenamiento local
   */
  ejecutarReprogramacion(id) {
    localStorage.setItem('reprogramar_turno_id', id);
    window.location.href = `FormularioTurno.html?accion=reprogramar&id=${id}`;
  }

  /**
   * Acción 3A: Dispara la apertura del modal personalizado de confirmación de cancelación
   */
  solicitarCancelacionTurno(id) {
    this.turnoIdAProcesar = id;
    if (this.confirmModal) {
      this.confirmModal.classList.add('active');
    } else {
      // Fallback si por alguna razón no existe el modal en el DOM
      this.ejecutarCancelacionDirectaFallback(id);
    }
  }

  /**
   * Acción 3B: Procesa la eliminación física en Supabase y activa el modal de éxito
   */
  async ejecutarCancelacionEnBaseDeDatos(id) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente de Supabase no disponible.');

      const { error } = await client
        .from('turnos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (this.successModal) {
        this.successModal.classList.add('active');
      } else {
        alert('El turno ha sido cancelado con éxito.');
        window.location.reload();
      }

    } catch (err) {
      console.error('[MisTurnos Error Cancelación]:', err.message || err);
      alert('Ocurrió un error al intentar cancelar la cita. Intente nuevamente.');
    }
  }

  /**
   * Método de respaldo (Fallback con confirm nativo) en caso de ausencia de modales
   */
  async ejecutarCancelacionDirectaFallback(id) {
    const confirmacion = confirm('¿Está seguro de que desea cancelar definitivamente esta cita médica?');
    if (!confirmacion) return;

    await this.ejecutarCancelacionEnBaseDeDatos(id);
  }
}

/* ============================================================================
   FUNCIONES GLOBALES DE CONTROL DE MODALES Y NAVEGACIÓN
   ============================================================================ */

function mostrarAyudaReserva() {
  const modal = document.getElementById('modalAyuda');
  if (modal) modal.style.display = 'flex';
}

function cerrarAyudaReserva() {
  const modal = document.getElementById('modalAyuda');
  if (modal) modal.style.display = 'none';
}

function cerrarModalDetalle() {
  const modal = document.getElementById('modalDetalleTurno');
  if (modal) modal.style.display = 'none';
}

// Exposición explícita en el objeto window para compatibilidad con eventos inline HTML
window.mostrarAyudaReserva = mostrarAyudaReserva;
window.cerrarAyudaReserva = cerrarAyudaReserva;
window.cerrarModalDetalle = cerrarModalDetalle;

/* ============================================================================
   INICIALIZACIÓN DEL CONTROLADOR AL CARGAR EL DOM
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  window.misTurnosApp = new MisTurnosController();
});