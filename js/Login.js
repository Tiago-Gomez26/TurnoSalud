/**
 * ============================================================================
 * TURNOSALUD - ACCESO ADMINISTRATIVO Y MÉDICO (Login.js)
 * Módulo de Autenticación Segura y Enrutamiento por Rol
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
      // 1. Iniciar sesión mediante Supabase Auth con email y contraseña
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        alert('Credenciales de acceso no válidas. Verifique e intente nuevamente.');
        console.warn('[Login Auth Warning]:', error.message);
        return;
      }

      console.log('[Login Success] Sesión autorizada:', data.user.email);
      
      // 2. Almacenar el token de acceso en sessionStorage para compatibilidad con verificaciones locales
      if (data && data.session && data.session.access_token) {
        sessionStorage.setItem('medico_session_token', data.session.access_token);
      }

      const userId = data.user.id;

      // 3. Consultar la tabla 'medicos' para determinar si el usuario es un médico o un administrador
      const { data: medicoData, error: medicoError } = await supabase
        .from('medicos')
        .select('id, nombre')
        .eq('user_id', userId)
        .maybeSingle();

      if (medicoError) {
        console.error('[Login] Error comprobando el perfil de médico:', medicoError.message);
      }

      // 4. Redirección dinámica según el rol del usuario autenticado
      if (medicoData) {
        // Si existe un registro en la tabla 'medicos', es un Médico: redirigir a su vista de turnos
        console.log(`[Login] Redirigiendo médico: ${medicoData.nombre}`);
        window.location.href = 'ListaDeTurnos.html';
      } else {
        // Si no existe un registro asociado en la tabla 'medicos', es Administrador: redirigir al panel de administración
        console.log('[Login] Redirigiendo al Panel de Administración Institucional.');
        window.location.href = 'ListaDeAdministracion.html';
      }

    } catch (err) {
      console.error('[Login Exception]:', err);
      alert('Ocurrió un error inesperado al procesar el ingreso.');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LoginController();
});