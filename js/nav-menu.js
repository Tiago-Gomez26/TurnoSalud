/**
 * ============================================================================
 * TurnoSalud — Menú de navegación (js/nav-menu.js)
 * ============================================================================
 * Componente único usado por index.html, ListaMedicos.html, FormularioTurno.html
 * y MisTurnos.html. Reemplaza la antigua barra inferior de 4 botones que estaba
 * copiada y pegada en cada archivo (con el bug de que el ítem "activo" no se
 * marcaba en todas las páginas).
 */

(function () {
  'use strict';

  function marcarPaginaActiva() {
    const actual = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.menu-link[href]').forEach(function (link) {
      if (link.getAttribute('href') === actual) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function initMenu() {
    const toggle = document.getElementById('menuToggle');
    const dropdown = document.getElementById('menuDropdown');
    if (!toggle || !dropdown) return;

    function cerrarMenu() {
      dropdown.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function abrirMenu() {
      dropdown.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (dropdown.classList.contains('open')) {
        cerrarMenu();
      } else {
        abrirMenu();
      }
    });

    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target) && e.target !== toggle) {
        cerrarMenu();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarMenu();
    });

    // Cerrar el menú al elegir cualquier opción (incluida "Ayuda")
    dropdown.querySelectorAll('.menu-link').forEach(function (link) {
      link.addEventListener('click', cerrarMenu);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    marcarPaginaActiva();
    initMenu();
  });
})();
