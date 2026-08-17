/**
 * ============================================================================
 * TURNOSALUD - SELECCIÓN DE PROFESIONALES (ListaMedicos.js)
 * Catálogo Dinámico y Selección de Staff Médico
 * ============================================================================
 */

class ListaMedicosController {
  constructor() {
    this.contenedorMedicos = document.getElementById('contenedorMedicos');
    this.init();
  }

  async init() {
    await this.cargarStaffMedico();
  }

  async cargarStaffMedico() {
    try {
      const { data: medicos, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('activo', true);

      if (error || !medicos || medicos.length === 0) {
        console.info('[ListaMedicos] Cargando catálogo estático por defecto.');
        return; // Mantiene el listado HTML por defecto si no hay BD de médicos aún
      }

      this.renderizarMedicos(medicos);
    } catch (err) {
      console.error('[ListaMedicos Error]:', err);
    }
  }

  renderizarMedicos(medicos) {
    if (!this.contenedorMedicos) return;
    this.contenedorMedicos.innerHTML = '';

    medicos.forEach(medico => {
      const card = document.createElement('div');
      card.className = 'medico-card';
      card.innerHTML = `
        <div class="medico-info">
          <h3>${medico.nombre_completo}</h3>
          <p>🩺 ${medico.especialidad}</p>
        </div>
        <button class="btn-seleccionar" onclick="ListaMedicosController.seleccionarMedico('${medico.id}', '${medico.nombre_completo}')">
          Elegir
        </button>
      `;
      this.contenedorMedicos.appendChild(card);
    });
  }

  static seleccionarMedico(id, nombre) {
    localStorage.setItem('medico_seleccionado_id', id);
    localStorage.setItem('medico_seleccionado_nombre', nombre);
    window.location.href = 'FormularioTurno.html';
  }
}

// Método global expuesto para el evento onclick
window.seleccionarMedico = ListaMedicosController.seleccionarMedico;

document.addEventListener('DOMContentLoaded', () => {
  new ListaMedicosController();
});