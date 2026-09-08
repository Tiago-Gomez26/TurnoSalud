class ConfiguracionController {
  constructor() {
    this.init();
  }

  /**
   * Inicializa las configuraciones persistentes al cargar la página
   * y configura los elementos DOM requeridos.
   */
  init() {
    // Aplicar configuraciones guardadas inmediatamente para evitar parpadeos de pantalla (FOUC)
    this.aplicarTemaGuardado();
    this.aplicarTamanoFuenteGuardado();

    document.addEventListener('DOMContentLoaded', () => {
      this.inyectarModalConfiguracion();
      this.vincularEventos();
    });
  }

  /**
   * Lee la preferencia guardada en localStorage e inserta/remueve la clase .dark-mode en el body
   */
  aplicarTemaGuardado() {
    const modoOscuro = localStorage.getItem('config_modo_oscuro') === 'true';
    if (modoOscuro) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  /**
   * Aplica la escala o tamaño de fuente guardado modificando las propiedades base y variables CSS
   */
  aplicarTamanoFuenteGuardado() {
    const fontScale = localStorage.getItem('config_font_scale') || localStorage.getItem('config_font_size') || '100%';
    
    // Aplicación directa a la raíz para unidades relativas (rem/em)
    document.documentElement.style.fontSize = fontScale;
    document.body.style.fontSize = fontScale;
    
    // Asignación de variable CSS de respaldo
    document.documentElement.style.setProperty('--font-size-base', fontScale);
  }

  /**
   * Construye e inyecta la ventana modal de ajustes al final del body si no está presente
   */
  inyectarModalConfiguracion() {
    if (document.getElementById('modalConfiguracion')) return;

    // Si no existe botón de navbar ni ítem en el menú, se crea un botón flotante de respaldo en la esquina inferior
    if (!document.getElementById('btnConfigNav') && !document.getElementById('btnAbrirAjustesMenu') && !document.getElementById('btnConfigFloat')) {
      const btnFloat = document.createElement('button');
      btnFloat.id = 'btnConfigFloat';
      btnFloat.className = 'btn-config-float';
      btnFloat.type = 'button';
      btnFloat.innerHTML = '⚙️';
      btnFloat.title = 'Configuración y Accesibilidad';
      document.body.appendChild(btnFloat);
    }

    const modoOscuroActivo = localStorage.getItem('config_modo_oscuro') === 'true';
    const fontScaleActivo = localStorage.getItem('config_font_scale') || localStorage.getItem('config_font_size') || '100%';

    const modalHTML = `
      <div id="modalConfiguracion" class="modal-config" role="dialog" aria-labelledby="tituloModalConfig" aria-modal="true">
        <div class="modal-config-content">
          
          <div class="modal-config-header">
            <h3 id="tituloModalConfig">⚙️ Ajustes de la App</h3>
          </div>
          
          <div class="config-group">
            <label>Apariencia del Sistema</label>
            <button id="btnToggleTema" type="button" class="btn-config-action">
              ${modoOscuroActivo ? '☀️ Cambiar a Modo Claro' : '🌙 Cambiar a Modo Oscuro'}
            </button>
          </div>

          <div class="config-group">
            <label for="selectFontSize">Tamaño de Texto</label>
            <select id="selectFontSize" class="select-config">
              <option value="90%" ${fontScaleActivo === '90%' || fontScaleActivo === '14px' ? 'selected' : ''}>Pequeño</option>
              <option value="100%" ${fontScaleActivo === '100%' || fontScaleActivo === '16px' ? 'selected' : ''}>Normal</option>
              <option value="115%" ${fontScaleActivo === '115%' || fontScaleActivo === '18px' ? 'selected' : ''}>Grande</option>
              <option value="130%" ${fontScaleActivo === '130%' || fontScaleActivo === '20px' ? 'selected' : ''}>Muy Grande</option>
            </select>
          </div>

          <div style="margin-top: 24px;">
            <button id="btnCerrarConfig" type="button" class="btn-config-cerrar">Aceptar</button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  /**
   * Asigna los escuchadores de eventos delegados para soportar botones dinámicos y controles
   */
  vincularEventos() {
    // Delegación de eventos para clicks globales
    document.addEventListener('click', (e) => {
      const btnNav = e.target.closest('#btnConfigNav');
      const btnMenuAjustes = e.target.closest('#btnAbrirAjustesMenu');
      const btnFloat = e.target.closest('#btnConfigFloat');
      const modal = document.getElementById('modalConfiguracion');
      const btnCerrar = e.target.closest('#btnCerrarConfig');
      const btnToggleTema = e.target.closest('#btnToggleTema');

      // Abrir Modal desde Navbar, Menú de Navegación o Botón Flotante
      if ((btnNav || btnMenuAjustes || btnFloat) && modal) {
        modal.classList.add('active');
      }

      // Cerrar Modal
      if (btnCerrar && modal) {
        modal.classList.remove('active');
      }

      // Alternar Modo Oscuro / Claro
      if (btnToggleTema) {
        const esOscuro = document.body.classList.toggle('dark-mode');
        localStorage.setItem('config_modo_oscuro', esOscuro);
        
        btnToggleTema.innerHTML = esOscuro ? '☀️ Cambiar a Modo Claro' : '🌙 Cambiar a Modo Oscuro';
      }
    });

    // Escuchador para cambios en la selección del tamaño de fuente
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'selectFontSize') {
        const nuevaEscala = e.target.value;
        
        document.documentElement.style.fontSize = nuevaEscala;
        document.body.style.fontSize = nuevaEscala;
        document.documentElement.style.setProperty('--font-size-base', nuevaEscala);
        
        localStorage.setItem('config_font_scale', nuevaEscala);
        localStorage.setItem('config_font_size', nuevaEscala);
      }
    });
  }
}

// Inicialización global del controlador
window.configuracionController = new ConfiguracionController();