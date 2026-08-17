/**
 * ============================================================================
 * TURNOSALUD - ACCESO ADMINISTRATIVO (Login.js)
 * Módulo de Autenticación Segura de Personal Sanitario
 * ============================================================================
 */

class LoginController {
  constructor() {
    this.form = document.getElementById('formLogin');
    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.autenticarPersonal(e));
    }
  }

  async autenticarPersonal(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert('Credenciales de acceso no válidas. Verifique e intente nuevamente.');
        console.warn('[Login Auth Warning]:', error.message);
      } else {
        console.log('[Login Success] Sesión autorizada:', data.user.email);
        sessionStorage.setItem('medico_session_token', data.session.access_token);
        window.location.href = 'ListaDeTurnos.html';
      }
    } catch (err) {
      console.error('[Login Exception]:', err);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LoginController();
});